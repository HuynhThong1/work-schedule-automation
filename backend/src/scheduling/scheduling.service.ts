import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Cron, CronExpression } from '@nestjs/schedule';
import { IsString, IsOptional, IsBoolean, IsDateString } from 'class-validator';
import moment from 'moment';
import * as _ from 'lodash';

import { Schedule, ScheduleDocument, ScheduleStatus } from '../schemas/schedule.schema';
import { Shift, ShiftDocument, ShiftStatus } from '../schemas/shift.schema';
import { Employee, EmployeeDocument } from '../schemas/employee.schema';
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
    const schedule = new this.scheduleModel({
      ...createScheduleDto,
      createdBy: new Types.ObjectId(createScheduleDto.createdBy),
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

            // Approve the request
            await this.shiftRequestModel.findByIdAndUpdate((request as ShiftRequestDocument)._id, {
              status: RequestStatus.APPROVED,
              reviewedAt: new Date(),
            });
          }
        }
      }

      // Fill remaining spots with available employees
      const assignmentRules = rules.filter(rule => rule.type === RuleType.ASSIGNMENT);
      const assignmentMethod = this.getAssignmentMethod(assignmentRules);

      while (shift.assignedEmployees.length < shift.capacity && availableEmployees.length > 0) {
        let selectedEmployee;

        if (assignmentMethod === 'random') {
          selectedEmployee = _.sample(availableEmployees);
        } else {
          // Default to first available (already sorted by priority)
          selectedEmployee = availableEmployees[0];
        }

        if (selectedEmployee && await this.canAssignEmployee(selectedEmployee, shift, rules)) {
          shift.assignedEmployees.push((selectedEmployee as EmployeeDocument)._id as Types.ObjectId);
          availableEmployees = availableEmployees.filter(emp =>
            (emp as EmployeeDocument)._id.toString() !== (selectedEmployee as EmployeeDocument)._id.toString()
          );
        } else {
          break;
        }
      }

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

  private async getAvailableEmployees(shift: Shift, allEmployees: EmployeeDocument[], rules: Rule[]): Promise<EmployeeDocument[]> {
    const dayOfWeek = moment(shift.date).format('dddd').toLowerCase();

    return allEmployees.filter(employee => {
      // Check availability
      const isAvailable = employee.availability.some(slot =>
        slot.day === dayOfWeek &&
        slot.startTime <= shift.startTime &&
        slot.endTime >= shift.endTime
      );

      if (!isAvailable) return false;

      // Check if already assigned to this shift
      const alreadyAssigned = shift.assignedEmployees.some(assignedId =>
        assignedId.toString() === employee._id.toString()
      );

      return !alreadyAssigned;
    });
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

  private getAssignmentMethod(assignmentRules: Rule[]): string {
    const randomRule = assignmentRules.find(rule =>
      rule.parameters.method === 'random'
    );

    return randomRule ? 'random' : 'priority';
  }
}
