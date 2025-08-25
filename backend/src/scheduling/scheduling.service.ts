import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Cron, CronExpression } from '@nestjs/schedule';
import { IsString, IsOptional, IsBoolean, IsDateString } from 'class-validator';
import moment from 'moment';
import * as _ from 'lodash';

import { Schedule, ScheduleDocument, ScheduleStatus } from '../schemas/schedule.schema';
import { Shift, ShiftDocument, ShiftStatus } from '../schemas/shift.schema';
import { Employee, EmployeeDocument, EmployeeType } from '../schemas/employee.schema';
import { Rule, RuleDocument, RuleType } from '../schemas/rule.schema';
import { ShiftRequest, ShiftRequestDocument, RequestStatus, RequestType } from '../schemas/shift-request.schema';
import { RulesService } from '../rules/rules.service';

export class CreateScheduleDto {
  @IsDateString()
  startDate: Date;

  @IsDateString()
  endDate: Date;

  @IsString()
  name: string;

  @IsString()
  createdBy: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsBoolean()
  isTemplate?: boolean;
}

export class GenerateScheduleDto {
  @IsDateString()
  startDate: Date;

  @IsDateString()
  endDate: Date;

  @IsString()
  name: string;

  @IsString()
  createdBy: string;

  @IsOptional()
  @IsBoolean()
  autoAssign?: boolean;

  @IsOptional()
  @IsBoolean()
  respectRequests?: boolean;
}

export class AutoGenerateScheduleDto {
  @IsDateString()
  startDate: Date;

  @IsDateString()
  endDate: Date;

  @IsString()
  name: string;

  @IsString()
  createdBy: string;

  @IsOptional()
  @IsBoolean()
  respectRequests?: boolean;

  @IsOptional()
  @IsBoolean()
  createStandardShifts?: boolean;
}

@Injectable()
export class SchedulingService {
  constructor(
    @InjectModel(Schedule.name) private scheduleModel: Model<ScheduleDocument>,
    @InjectModel(Shift.name) private shiftModel: Model<ShiftDocument>,
    @InjectModel(Employee.name) private employeeModel: Model<EmployeeDocument>,
    @InjectModel(Rule.name) private ruleModel: Model<RuleDocument>,
    @InjectModel(ShiftRequest.name) private shiftRequestModel: Model<ShiftRequestDocument>,
    private rulesService: RulesService,
  ) {}

  // Run every Sunday at 6 AM to generate next week's schedule
  @Cron('0 6 * * 0', {
    name: 'generateWeeklySchedule',
    timeZone: 'Asia/Ho_Chi_Minh',
  })
  async handleWeeklyScheduleGeneration() {
    console.log('🕐 Generating weekly schedule...');

    const nextMonday = moment().add(1, 'week').startOf('isoWeek');
    const nextSunday = moment(nextMonday).endOf('isoWeek');

    try {
      await this.generateSchedule({
        startDate: nextMonday.toDate(),
        endDate: nextSunday.toDate(),
        name: `Week of ${nextMonday.format('MMM DD, YYYY')}`,
        createdBy: 'system', // System generated
        autoAssign: true,
        respectRequests: true,
      });

      console.log('✅ Weekly schedule generated successfully');
    } catch (error) {
      console.error('❌ Failed to generate weekly schedule:', error);
    }
  }

  async create(createScheduleDto: CreateScheduleDto): Promise<ScheduleDocument> {
    // Validate and convert createdBy to ObjectId
    let createdByObjectId: Types.ObjectId;
    try {
      createdByObjectId = new Types.ObjectId(createScheduleDto.createdBy);
    } catch (error) {
      throw new BadRequestException(`Invalid createdBy ID: ${createScheduleDto.createdBy}. Must be a valid ObjectId.`);
    }

    const schedule = new this.scheduleModel({
      ...createScheduleDto,
      createdBy: createdByObjectId,
    });
    return schedule.save();
  }

  async findAll(): Promise<Schedule[]> {
    return this.scheduleModel
      .find()
      .populate('shifts')
      .populate('createdBy', 'name code level')
      .sort({ startDate: -1 })
      .exec();
  }

  async findOne(id: string): Promise<Schedule> {
    const schedule = await this.scheduleModel
      .findById(id)
      .populate({
        path: 'shifts',
        populate: {
          path: 'assignedEmployees',
          select: 'name code type',
        },
      })
      .populate('createdBy', 'name code level')
      .exec();

    if (!schedule) {
      throw new NotFoundException(`Schedule with ID ${id} not found`);
    }

    return schedule;
  }

  async generateSchedule(generateScheduleDto: GenerateScheduleDto): Promise<Schedule> {
    const { startDate, endDate, name, createdBy, autoAssign = true, respectRequests = true } = generateScheduleDto;

    // Get all shifts in the date range
    const shifts = await this.shiftModel
      .find({
        date: { $gte: startDate, $lte: endDate },
        status: { $in: [ShiftStatus.DRAFT, ShiftStatus.PUBLISHED] },
      })
      .exec();

    if (shifts.length === 0) {
      throw new BadRequestException('No shifts found in the specified date range');
    }

    // Create the schedule
    const schedule = await this.create({
      startDate,
      endDate,
      name,
      createdBy,
      notes: autoAssign ? 'Auto-generated schedule' : 'Manual schedule',
    });

    // Add shifts to schedule
    schedule.shifts = shifts.map(shift => shift._id as Types.ObjectId);
    await schedule.save();

    if (autoAssign) {
      await this.autoAssignEmployees(schedule._id.toString(), respectRequests);
    }

    return this.findOne(schedule._id.toString());
  }

  async autoProcessShiftRequests(shiftIds: string[]): Promise<{ approvedRequests: number, rejectedRequests: number, processedShifts: Shift[] }> {
    console.log(`🔄 Starting auto-processing of shift requests for ${shiftIds.length} shifts`);

    // Get all pending shift requests for the specified shifts
    const pendingRequests = await this.shiftRequestModel
      .find({
        status: RequestStatus.PENDING,
        type: RequestType.PICKUP,
        shiftId: { $in: shiftIds }
      })
      .populate('employeeId', 'name code type availability')
      .populate('shiftId')
      .exec();

    console.log(`📋 Found ${pendingRequests.length} pending shift requests to process`);

    if (pendingRequests.length === 0) {
      return { approvedRequests: 0, rejectedRequests: 0, processedShifts: [] };
    }

    // Get all shifts to calculate current assignments for equal distribution
    const allShifts = await this.shiftModel.find().exec();
    const employeeShiftCounts = await this.getEmployeeShiftCountsFromShifts(allShifts);
    console.log(`📊 Current employee shift counts:`, employeeShiftCounts);

    // Group requests by shift for processing
    const requestsByShift = new Map<string, any[]>();
    for (const request of pendingRequests) {
      const shiftId = request.shiftId._id.toString();
      if (!requestsByShift.has(shiftId)) {
        requestsByShift.set(shiftId, []);
      }
      requestsByShift.get(shiftId)!.push(request);
    }

    let approvedCount = 0;
    let rejectedCount = 0;
    const processedShifts: Shift[] = [];

    // Process each shift's requests
    for (const [shiftId, requests] of requestsByShift) {
      const shift = await this.shiftModel.findById(shiftId).exec();
      if (!shift) continue;

      console.log(`🕐 Processing ${requests.length} requests for shift: ${shift.name} on ${moment(shift.date).format('YYYY-MM-DD')} ${shift.startTime}-${shift.endTime}`);
      console.log(`   Current capacity: ${shift.assignedEmployees.length}/${shift.capacity}`);

      // Sort requests by priority: NEW employees first (for mentoring), then by equal distribution
      const sortedRequests = requests.sort((a, b) => {
        const empA = a.employeeId;
        const empB = b.employeeId;

        // Prioritize NEW employees
        if (empA.type === EmployeeType.NEW && empB.type !== EmployeeType.NEW) return -1;
        if (empB.type === EmployeeType.NEW && empA.type !== EmployeeType.NEW) return 1;

        // Then sort by equal distribution (fewer shifts first)
        const countA = employeeShiftCounts[empA._id.toString()] || 0;
        const countB = employeeShiftCounts[empB._id.toString()] || 0;
        return countA - countB;
      });

      // Track assignments in this shift for mentoring logic
      const newEmployeesInShift = new Set<string>();
      const juniorEmployeesInShift = new Set<string>();

      // Process each request for this shift
      for (const request of sortedRequests) {
        const employee = request.employeeId;
        const canAssign = await this.canEmployeeWorkShift(employee, shift);

        if (!canAssign.canWork) {
          // Reject the request
          await this.shiftRequestModel.findByIdAndUpdate(request._id, {
            status: RequestStatus.REJECTED,
            reviewedAt: new Date(),
            reviewNotes: canAssign.reason
          });
          rejectedCount++;
          console.log(`   ❌ Rejected ${employee.name}: ${canAssign.reason}`);
          continue;
        }

        // Check if shift has capacity
        if (shift.assignedEmployees.length >= shift.capacity) {
          await this.shiftRequestModel.findByIdAndUpdate(request._id, {
            status: RequestStatus.REJECTED,
            reviewedAt: new Date(),
            reviewNotes: 'Shift is at full capacity'
          });
          rejectedCount++;
          console.log(`   ❌ Rejected ${employee.name}: Shift at full capacity`);
          continue;
        }

        // Special handling for NEW employees - ensure they have a JUNIOR mentor
        if (employee.type === EmployeeType.NEW) {
          const hasJuniorMentor = juniorEmployeesInShift.size > 0 ||
            shift.assignedEmployees.some(empId => {
              const assignedEmp = allShifts.find(s => s.assignedEmployees.includes(empId));
              return assignedEmp; // This would need proper employee lookup
            });

          // For now, we'll approve NEW employees and try to ensure JUNIOR employees are also approved
          newEmployeesInShift.add(employee._id.toString());
        } else if (employee.type === EmployeeType.JUNIOR) {
          juniorEmployeesInShift.add(employee._id.toString());
        }

        // Approve the request and assign to shift
        shift.assignedEmployees.push(employee._id);
        employeeShiftCounts[employee._id.toString()] = (employeeShiftCounts[employee._id.toString()] || 0) + 1;

        await this.shiftRequestModel.findByIdAndUpdate(request._id, {
          status: RequestStatus.APPROVED,
          reviewedAt: new Date(),
          reviewNotes: 'Auto-approved based on availability and capacity'
        });

        approvedCount++;
        console.log(`   ✅ Approved ${employee.name} (${employee.type})`);
      }

      await shift.save();
      processedShifts.push(shift);
    }

    console.log(`✅ Auto-processing complete: ${approvedCount} approved, ${rejectedCount} rejected`);
    return { approvedRequests: approvedCount, rejectedRequests: rejectedCount, processedShifts };
  }

  async autoAssignEmployeesToShifts(shiftIds: string[], respectRequests = true): Promise<Shift[]> {
    console.log(`🔄 Starting auto-assignment for ${shiftIds.length} shifts`);

    const rules = await this.rulesService.findActive();

    // Get all employees
    const employees = await this.employeeModel.find({ isActive: true }).exec();
    console.log(`👥 Found ${employees.length} active employees`);

    // Get shift requests if we should respect them
    let shiftRequests: ShiftRequest[] = [];
    if (respectRequests) {
      shiftRequests = await this.shiftRequestModel
        .find({
          status: RequestStatus.PENDING,
          type: RequestType.REQUEST,
        })
        .populate('shiftId')
        .exec();
      console.log(`📋 Found ${shiftRequests.length} pending shift requests`);
    }

    // Calculate current shift assignments for equal distribution across ALL shifts (not just the ones we're processing)
    const allShifts = await this.shiftModel.find().exec();
    const employeeShiftCounts = await this.getEmployeeShiftCountsFromShifts(allShifts);
    console.log(`📊 Employee shift counts:`, employeeShiftCounts);

    const processedShifts: Shift[] = [];

    // Process each shift
    for (const shiftId of shiftIds) {
      const shift = await this.shiftModel.findById(shiftId).exec();
      if (!shift) {
        console.log(`⚠️ Shift ${shiftId} not found`);
        continue;
      }

      console.log(`🕐 Processing shift: ${shift.name} on ${moment(shift.date).format('YYYY-MM-DD')} ${shift.startTime}-${shift.endTime}`);
      console.log(`   Current assignments: ${shift.assignedEmployees.length}/${shift.capacity}`);

      if (shift.assignedEmployees.length >= shift.capacity) {
        console.log(`   ⚠️ Shift is at full capacity, skipping`);
        processedShifts.push(shift);
        continue;
      }

      // Get available employees for this shift
      let availableEmployees = await this.getAvailableEmployees(shift, employees, rules);
      console.log(`   👥 Found ${availableEmployees.length} available employees: ${availableEmployees.map(e => e.name).join(', ')}`);

      if (availableEmployees.length === 0) {
        console.log(`   ⚠️ No available employees for this shift`);
        processedShifts.push(shift);
        continue;
      }

      // Apply priority rules
      const priorityRules = rules.filter(rule => rule.type === RuleType.PRIORITY);
      if (priorityRules.length > 0) {
        availableEmployees = await this.rulesService.applyPriorityRules(availableEmployees, priorityRules);
      }

      // Handle shift requests first
      if (respectRequests) {
        const requestsForShift = shiftRequests.filter(req =>
          req.shiftId && req.shiftId.toString() === shift._id.toString()
        );

        for (const request of requestsForShift) {
          if (shift.assignedEmployees.length >= shift.capacity) break;

          const employee = availableEmployees.find(emp =>
            (emp as EmployeeDocument)._id.toString() === request.employeeId.toString()
          );

          if (employee && await this.canAssignEmployee(employee, shift, rules)) {
            shift.assignedEmployees.push((employee as EmployeeDocument)._id as Types.ObjectId);
            availableEmployees = availableEmployees.filter(emp =>
              (emp as EmployeeDocument)._id.toString() !== (employee as EmployeeDocument)._id.toString()
            );

            // Update shift count for equal distribution tracking
            const empId = (employee as EmployeeDocument)._id.toString();
            employeeShiftCounts[empId] = (employeeShiftCounts[empId] || 0) + 1;

            // Approve the request
            await this.shiftRequestModel.findByIdAndUpdate((request as ShiftRequestDocument)._id, {
              status: RequestStatus.APPROVED,
              reviewedAt: new Date(),
            });
          }
        }
      }

      // Fill remaining spots with available employees using equal distribution and mentoring logic
      await this.assignEmployeesWithEqualDistributionAndMentoring(
        shift,
        availableEmployees,
        employeeShiftCounts,
        rules
      );

      await shift.save();
      processedShifts.push(shift);
    }

    return processedShifts;
  }

  async autoAssignEmployees(scheduleId: string, respectRequests = true): Promise<Schedule> {
    const schedule = await this.findOne(scheduleId);
    const rules = await this.rulesService.findActive();

    // Get all employees
    const employees = await this.employeeModel.find({ isActive: true }).exec();

    // Get shift requests if we should respect them
    let shiftRequests: ShiftRequest[] = [];
    if (respectRequests) {
      shiftRequests = await this.shiftRequestModel
        .find({
          status: RequestStatus.PENDING,
          type: RequestType.REQUEST,
        })
        .populate('shiftId')
        .exec();
    }

    // Calculate current shift assignments for equal distribution
    const employeeShiftCounts = await this.getEmployeeShiftCounts(schedule.shifts);

    // Process each shift
    for (const shiftId of schedule.shifts) {
      const shift = await this.shiftModel.findById(shiftId).exec();
      if (!shift || shift.assignedEmployees.length >= shift.capacity) {
        continue;
      }

      // Get available employees for this shift
      let availableEmployees = await this.getAvailableEmployees(shift, employees, rules);

      // Apply priority rules
      const priorityRules = rules.filter(rule => rule.type === RuleType.PRIORITY);
      if (priorityRules.length > 0) {
        availableEmployees = await this.rulesService.applyPriorityRules(availableEmployees, priorityRules);
      }

      // Handle shift requests first
      if (respectRequests) {
        const requestsForShift = shiftRequests.filter(req =>
          req.shiftId.toString() === shift._id.toString()
        );

        for (const request of requestsForShift) {
          if (shift.assignedEmployees.length >= shift.capacity) break;

          const employee = availableEmployees.find(emp =>
            (emp as EmployeeDocument)._id.toString() === request.employeeId.toString()
          );

          if (employee && await this.canAssignEmployee(employee, shift, rules)) {
            shift.assignedEmployees.push((employee as EmployeeDocument)._id as Types.ObjectId);
            availableEmployees = availableEmployees.filter(emp =>
              (emp as EmployeeDocument)._id.toString() !== (employee as EmployeeDocument)._id.toString()
            );

            // Update shift count for equal distribution tracking
            const empId = (employee as EmployeeDocument)._id.toString();
            employeeShiftCounts[empId] = (employeeShiftCounts[empId] || 0) + 1;

            // Approve the request
            await this.shiftRequestModel.findByIdAndUpdate((request as ShiftRequestDocument)._id, {
              status: RequestStatus.APPROVED,
              reviewedAt: new Date(),
            });
          }
        }
      }

      // Fill remaining spots with available employees using equal distribution and mentoring logic
      await this.assignEmployeesWithEqualDistributionAndMentoring(
        shift,
        availableEmployees,
        employeeShiftCounts,
        rules
      );

      await shift.save();
    }

    return this.findOne(scheduleId);
  }

  async publishSchedule(id: string): Promise<Schedule> {
    const schedule = await this.scheduleModel
      .findByIdAndUpdate(id, { status: ScheduleStatus.PUBLISHED }, { new: true })
      .exec();

    if (!schedule) {
      throw new NotFoundException(`Schedule with ID ${id} not found`);
    }

    // Publish all shifts in the schedule
    await this.shiftModel.updateMany(
      { _id: { $in: schedule.shifts } },
      { status: ShiftStatus.PUBLISHED }
    );

    return schedule;
  }

  async remove(id: string): Promise<Schedule> {
    const schedule = await this.scheduleModel.findById(id).exec();
    if (!schedule) {
      throw new NotFoundException(`Schedule with ID ${id} not found`);
    }

    if (schedule.status === ScheduleStatus.PUBLISHED) {
      throw new BadRequestException('Cannot delete published schedules');
    }

    const deletedSchedule = await this.scheduleModel.findByIdAndDelete(id).exec();
    return deletedSchedule!;
  }

  private async getAvailableEmployees(shift: Shift, allEmployees: EmployeeDocument[], rules: Rule[]): Promise<EmployeeDocument[]> {
    const dayOfWeek = moment(shift.date).format('dddd').toLowerCase();
    console.log(`     🔍 Checking availability for ${dayOfWeek} ${shift.startTime}-${shift.endTime}`);

    return allEmployees.filter(employee => {
      // Check availability
      const isAvailable = employee.availability.some(slot => {
        if (slot.day !== dayOfWeek) return false;

        // Convert times to minutes for proper comparison
        const slotStart = this.timeToMinutes(slot.startTime);
        const slotEnd = this.timeToMinutes(slot.endTime);
        const shiftStart = this.timeToMinutes(shift.startTime);
        const shiftEnd = this.timeToMinutes(shift.endTime);

        // Handle overnight shifts (e.g., 18:00-00:00)
        const adjustedShiftEnd = shiftEnd === 0 ? 24 * 60 : shiftEnd; // 00:00 becomes 24:00

        // Check if employee is available for the entire shift duration
        const canWork = slotStart <= shiftStart && slotEnd >= adjustedShiftEnd;

        console.log(`       ${employee.name}: ${slot.day} ${slot.startTime}-${slot.endTime} -> ${canWork ? '✅' : '❌'}`);

        return canWork;
      });

      if (!isAvailable) {
        console.log(`       ${employee.name}: Not available on ${dayOfWeek}`);
        return false;
      }

      // Check if already assigned to this shift
      const alreadyAssigned = shift.assignedEmployees.some(assignedId =>
        assignedId.toString() === employee._id.toString()
      );

      if (alreadyAssigned) {
        console.log(`       ${employee.name}: Already assigned to this shift`);
        return false;
      }

      console.log(`       ${employee.name}: Available ✅`);
      return true;
    });
  }

  private timeToMinutes(timeString: string): number {
    const [hours, minutes] = timeString.split(':').map(Number);
    return hours * 60 + minutes;
  }

  private async canEmployeeWorkShift(employee: any, shift: Shift): Promise<{ canWork: boolean, reason?: string }> {
    // Check if employee is already assigned to this shift
    if (shift.assignedEmployees.some(empId => empId.toString() === employee._id.toString())) {
      return { canWork: false, reason: 'Already assigned to this shift' };
    }

    // Check availability
    const dayOfWeek = moment(shift.date).format('dddd').toLowerCase();
    const isAvailable = employee.availability.some((slot: any) => {
      if (slot.day !== dayOfWeek) return false;

      const slotStart = this.timeToMinutes(slot.startTime);
      const slotEnd = this.timeToMinutes(slot.endTime);
      const shiftStart = this.timeToMinutes(shift.startTime);
      const shiftEnd = this.timeToMinutes(shift.endTime);

      // Handle overnight shifts
      const adjustedShiftEnd = shiftEnd === 0 ? 24 * 60 : shiftEnd;

      return slotStart <= shiftStart && slotEnd >= adjustedShiftEnd;
    });

    if (!isAvailable) {
      return { canWork: false, reason: `Not available on ${dayOfWeek} ${shift.startTime}-${shift.endTime}` };
    }

    // Check weekly hours limit
    const weeklyHours = await this.getEmployeeWeeklyHours(employee._id, shift.date);
    const shiftHours = this.calculateShiftHours(shift.startTime, shift.endTime);

    if (employee.maxHoursPerWeek && (weeklyHours + shiftHours) > employee.maxHoursPerWeek) {
      return { canWork: false, reason: `Would exceed weekly hours limit (${employee.maxHoursPerWeek}h)` };
    }

    return { canWork: true };
  }

  private calculateShiftHours(startTime: string, endTime: string): number {
    const start = this.timeToMinutes(startTime);
    const end = this.timeToMinutes(endTime);
    const adjustedEnd = end === 0 ? 24 * 60 : end; // Handle overnight shifts
    return (adjustedEnd - start) / 60;
  }

  private async canAssignEmployee(employee: EmployeeDocument, shift: Shift, rules: Rule[]): Promise<boolean> {
    const constraintRules = rules.filter(rule => rule.type === RuleType.CONSTRAINT);

    for (const rule of constraintRules) {
      const context = {
        employee,
        shift,
        assignedEmployees: shift.assignedEmployees,
        weeklyHours: await this.getEmployeeWeeklyHours(employee._id as Types.ObjectId, shift.date),
      };

      const isValid = await this.rulesService.validateRule(rule, context);
      if (!isValid) {
        return false;
      }
    }

    return true;
  }

  private async getEmployeeWeeklyHours(employeeId: Types.ObjectId, date: Date): Promise<number> {
    const startOfWeek = moment(date).startOf('isoWeek').toDate();
    const endOfWeek = moment(date).endOf('isoWeek').toDate();

    const shifts = await this.shiftModel
      .find({
        date: { $gte: startOfWeek, $lte: endOfWeek },
        assignedEmployees: employeeId,
      })
      .exec();

    let totalHours = 0;
    for (const shift of shifts) {
      const startTime = moment(shift.startTime, 'HH:mm');
      const endTime = moment(shift.endTime, 'HH:mm');

      if (endTime.isBefore(startTime)) {
        endTime.add(1, 'day');
      }

      totalHours += endTime.diff(startTime, 'hours', true);
    }

    return totalHours;
  }

  async autoGenerateScheduleWithShifts(autoGenerateDto: AutoGenerateScheduleDto): Promise<Schedule> {
    const { startDate, endDate, name, createdBy, respectRequests = true, createStandardShifts = true } = autoGenerateDto;

    // Create standard shifts for each day in the date range if requested
    if (createStandardShifts) {
      await this.createStandardShiftsForDateRange(startDate, endDate, createdBy);
    }

    // Now generate the schedule with auto-assignment
    return this.generateSchedule({
      startDate,
      endDate,
      name,
      createdBy,
      autoAssign: true,
      respectRequests,
    });
  }

  private async createStandardShiftsForDateRange(startDate: Date, endDate: Date, managerId: string): Promise<void> {
    // Validate managerId
    let managerObjectId: Types.ObjectId;
    try {
      managerObjectId = new Types.ObjectId(managerId);
    } catch (error) {
      throw new BadRequestException(`Invalid manager ID: ${managerId}. Must be a valid ObjectId.`);
    }
    const standardShifts = [
      { name: 'Morning Shift', startTime: '09:00', endTime: '14:00', capacity: 3 },
      { name: 'Afternoon Shift', startTime: '14:00', endTime: '18:00', capacity: 3 },
      { name: 'Evening Shift', startTime: '18:00', endTime: '00:00', capacity: 3 },
    ];

    const currentDate = moment(startDate);
    const endMoment = moment(endDate);
    const shiftsToCreate = [];

    console.log(`🔄 Creating standard shifts from ${currentDate.format('YYYY-MM-DD')} to ${endMoment.format('YYYY-MM-DD')}`);

    while (currentDate.isSameOrBefore(endMoment, 'day')) {
      for (const shiftTemplate of standardShifts) {
        // Check if shift already exists for this date and time
        const existingShift = await this.shiftModel.findOne({
          date: currentDate.toDate(),
          startTime: shiftTemplate.startTime,
          endTime: shiftTemplate.endTime,
        }).exec();

        if (!existingShift) {
          shiftsToCreate.push({
            date: currentDate.toDate(),
            startTime: shiftTemplate.startTime,
            endTime: shiftTemplate.endTime,
            name: shiftTemplate.name,
            capacity: shiftTemplate.capacity,
            manager: managerObjectId,
            status: ShiftStatus.DRAFT,
            assignedEmployees: [],
            description: `Auto-generated ${shiftTemplate.name.toLowerCase()} for ${currentDate.format('YYYY-MM-DD')}`,
          });
        }
      }
      currentDate.add(1, 'day');
    }

    if (shiftsToCreate.length > 0) {
      console.log(`✅ Creating ${shiftsToCreate.length} standard shifts`);
      await this.shiftModel.insertMany(shiftsToCreate);
    } else {
      console.log('ℹ️ All standard shifts already exist for the specified date range');
    }
  }

  async getShiftRequestsForDateRange(startDate: Date, endDate: Date): Promise<ShiftRequest[]> {
    return this.shiftRequestModel
      .find({
        status: RequestStatus.PENDING,
        type: RequestType.REQUEST,
        $or: [
          // For existing shift requests
          {
            shiftId: {
              $in: await this.shiftModel.distinct('_id', {
                date: { $gte: startDate, $lte: endDate }
              })
            }
          },
          // For direct date-based requests
          {
            date: { $gte: startDate, $lte: endDate }
          }
        ]
      })
      .populate('employeeId', 'name code type availability')
      .populate('shiftId')
      .exec();
  }

  private getAssignmentMethod(assignmentRules: Rule[]): string {
    const randomRule = assignmentRules.find(rule =>
      rule.parameters.method === 'random'
    );

    return randomRule ? 'random' : 'priority';
  }

  private async getEmployeeShiftCounts(shiftIds: Types.ObjectId[]): Promise<Record<string, number>> {
    const shifts = await this.shiftModel.find({ _id: { $in: shiftIds } }).exec();
    const counts: Record<string, number> = {};

    for (const shift of shifts) {
      for (const employeeId of shift.assignedEmployees) {
        const empId = employeeId.toString();
        counts[empId] = (counts[empId] || 0) + 1;
      }
    }

    return counts;
  }

  private async getEmployeeShiftCountsFromShifts(shifts: ShiftDocument[]): Promise<Record<string, number>> {
    const counts: Record<string, number> = {};

    for (const shift of shifts) {
      for (const employeeId of shift.assignedEmployees) {
        const empId = employeeId.toString();
        counts[empId] = (counts[empId] || 0) + 1;
      }
    }

    return counts;
  }

  private async assignEmployeesWithEqualDistributionAndMentoring(
    shift: ShiftDocument,
    availableEmployees: EmployeeDocument[],
    employeeShiftCounts: Record<string, number>,
    rules: Rule[]
  ): Promise<void> {
    // Separate employees by type
    const newEmployees = availableEmployees.filter(emp => emp.type === EmployeeType.NEW);
    const juniorEmployees = availableEmployees.filter(emp => emp.type === EmployeeType.JUNIOR);
    const otherEmployees = availableEmployees.filter(emp =>
      emp.type !== EmployeeType.NEW && emp.type !== EmployeeType.JUNIOR
    );

    // Sort employees by current shift count (ascending) for equal distribution
    const sortByShiftCount = (employees: EmployeeDocument[]) => {
      return employees.sort((a, b) => {
        const countA = employeeShiftCounts[a._id.toString()] || 0;
        const countB = employeeShiftCounts[b._id.toString()] || 0;
        return countA - countB;
      });
    };

    const sortedNewEmployees = sortByShiftCount([...newEmployees]);
    const sortedJuniorEmployees = sortByShiftCount([...juniorEmployees]);
    const sortedOtherEmployees = sortByShiftCount([...otherEmployees]);

    // Track assigned employees in this shift to avoid duplicates
    const assignedInThisShift = new Set<string>();

    // First, try to assign new employees with junior mentors
    for (const newEmployee of sortedNewEmployees) {
      if (shift.assignedEmployees.length >= shift.capacity) break;
      if (assignedInThisShift.has(newEmployee._id.toString())) continue;

      // Find an available junior employee to mentor
      const availableJunior = sortedJuniorEmployees.find(junior =>
        !assignedInThisShift.has(junior._id.toString()) &&
        this.canAssignEmployee(junior, shift, rules)
      );

      if (availableJunior && await this.canAssignEmployee(newEmployee, shift, rules)) {
        // Check if we have capacity for both employees
        if (shift.assignedEmployees.length + 2 <= shift.capacity) {
          // Assign both new employee and junior mentor
          shift.assignedEmployees.push(newEmployee._id as Types.ObjectId);
          shift.assignedEmployees.push(availableJunior._id as Types.ObjectId);

          assignedInThisShift.add(newEmployee._id.toString());
          assignedInThisShift.add(availableJunior._id.toString());

          // Update shift counts
          employeeShiftCounts[newEmployee._id.toString()] = (employeeShiftCounts[newEmployee._id.toString()] || 0) + 1;
          employeeShiftCounts[availableJunior._id.toString()] = (employeeShiftCounts[availableJunior._id.toString()] || 0) + 1;
        } else if (shift.assignedEmployees.length + 1 <= shift.capacity) {
          // Only assign the new employee if we can't fit both
          shift.assignedEmployees.push(newEmployee._id as Types.ObjectId);
          assignedInThisShift.add(newEmployee._id.toString());
          employeeShiftCounts[newEmployee._id.toString()] = (employeeShiftCounts[newEmployee._id.toString()] || 0) + 1;
        }
      }
    }

    // Fill remaining spots with other employees (junior and others), prioritizing equal distribution
    const remainingEmployees = [
      ...sortedJuniorEmployees.filter(emp => !assignedInThisShift.has(emp._id.toString())),
      ...sortedOtherEmployees.filter(emp => !assignedInThisShift.has(emp._id.toString()))
    ];

    for (const employee of remainingEmployees) {
      if (shift.assignedEmployees.length >= shift.capacity) break;
      if (assignedInThisShift.has(employee._id.toString())) continue;

      if (await this.canAssignEmployee(employee, shift, rules)) {
        shift.assignedEmployees.push(employee._id as Types.ObjectId);
        assignedInThisShift.add(employee._id.toString());
        employeeShiftCounts[employee._id.toString()] = (employeeShiftCounts[employee._id.toString()] || 0) + 1;
      }
    }

    // If we still have capacity and unassigned new employees without mentors, assign them
    const unassignedNewEmployees = sortedNewEmployees.filter(emp =>
      !assignedInThisShift.has(emp._id.toString())
    );

    for (const newEmployee of unassignedNewEmployees) {
      if (shift.assignedEmployees.length >= shift.capacity) break;

      if (await this.canAssignEmployee(newEmployee, shift, rules)) {
        shift.assignedEmployees.push(newEmployee._id as Types.ObjectId);
        assignedInThisShift.add(newEmployee._id.toString());
        employeeShiftCounts[newEmployee._id.toString()] = (employeeShiftCounts[newEmployee._id.toString()] || 0) + 1;
      }
    }
  }
}
