import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { IsString, IsNumber, IsOptional, IsBoolean, IsArray, IsEnum, IsDateString } from 'class-validator';
import { Shift, ShiftDocument, ShiftStatus } from '../schemas/shift.schema';
import { Employee, EmployeeDocument } from '../schemas/employee.schema';
import moment from 'moment';

export class CreateShiftDto {
  @IsDateString()
  date: Date;

  @IsString()
  startTime: string;

  @IsString()
  endTime: string;

  @IsString()
  name: string;

  @IsNumber()
  capacity: number;

  @IsString()
  manager: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  isRecurring?: boolean;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  recurringDays?: string[];

  @IsOptional()
  @IsArray()
  assignedEmployees?: string[];

  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;
}

export class UpdateShiftDto {
  @IsOptional()
  @IsDateString()
  date?: Date;

  @IsOptional()
  @IsString()
  startTime?: string;

  @IsOptional()
  @IsString()
  endTime?: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsNumber()
  capacity?: number;

  @IsOptional()
  @IsString()
  manager?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(ShiftStatus)
  status?: ShiftStatus;

  @IsOptional()
  @IsBoolean()
  isRecurring?: boolean;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  recurringDays?: string[];

  @IsOptional()
  @IsArray()
  assignedEmployees?: string[];

  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;
}

export class AssignEmployeeDto {
  @IsString()
  employeeId: string;
}

@Injectable()
export class ShiftsService {
  constructor(
    @InjectModel(Shift.name) private shiftModel: Model<ShiftDocument>,
    @InjectModel(Employee.name) private employeeModel: Model<EmployeeDocument>,
  ) {}

  async create(createShiftDto: CreateShiftDto): Promise<Shift> {
    // Validate time format
    if (!this.isValidTimeFormat(createShiftDto.startTime) || !this.isValidTimeFormat(createShiftDto.endTime)) {
      throw new BadRequestException('Invalid time format. Use HH:MM format');
    }

    // Validate that end time is after start time
    if (createShiftDto.startTime >= createShiftDto.endTime) {
      throw new BadRequestException('End time must be after start time');
    }

    const shift = new this.shiftModel({
      ...createShiftDto,
      manager: new Types.ObjectId(createShiftDto.manager),
      isRecurring: true, // All shifts are now recurring by default
    });

    const savedShift = await shift.save();

    // Automatically create recurring shifts for the entire year
    // Get the day of the week from the initial shift date
    const dayOfWeek = moment(savedShift.date).format('dddd').toLowerCase();
    await this.createYearlyRecurringShifts(savedShift, dayOfWeek);

    return savedShift;
  }

  async findAll(managerId?: string): Promise<Shift[]> {
    const filter = managerId ? { manager: new Types.ObjectId(managerId) } : {};
    return this.shiftModel
      .find(filter)
      .populate('assignedEmployees', 'name code type')
      .populate('manager', 'name code level')
      .sort({ date: 1, startTime: 1 })
      .exec();
  }

  async findByDateRange(startDate: Date, endDate: Date, managerId?: string): Promise<Shift[]> {
    const filter: any = {
      date: { $gte: startDate, $lte: endDate },
    };

    if (managerId) {
      filter.manager = new Types.ObjectId(managerId);
    }

    return this.shiftModel
      .find(filter)
      .populate('assignedEmployees', 'name code type')
      .populate('manager', 'name code level')
      .sort({ date: 1, startTime: 1 })
      .exec();
  }

  async findOne(id: string): Promise<Shift> {
    const shift = await this.shiftModel
      .findById(id)
      .populate('assignedEmployees', 'name code type salaryByHour')
      .populate('manager', 'name code level')
      .exec();

    if (!shift) {
      throw new NotFoundException(`Shift with ID ${id} not found`);
    }

    return shift;
  }

  async update(id: string, updateShiftDto: UpdateShiftDto): Promise<Shift> {
    // Validate time format if provided
    if (updateShiftDto.startTime && !this.isValidTimeFormat(updateShiftDto.startTime)) {
      throw new BadRequestException('Invalid start time format. Use HH:MM format');
    }
    if (updateShiftDto.endTime && !this.isValidTimeFormat(updateShiftDto.endTime)) {
      throw new BadRequestException('Invalid end time format. Use HH:MM format');
    }

    const updateData: any = { ...updateShiftDto };
    if (updateShiftDto.manager) {
      updateData.manager = new Types.ObjectId(updateShiftDto.manager);
    }

    const updatedShift = await this.shiftModel
      .findByIdAndUpdate(id, updateData, { new: true })
      .populate('assignedEmployees', 'name code type')
      .populate('manager', 'name code level')
      .exec();

    if (!updatedShift) {
      throw new NotFoundException(`Shift with ID ${id} not found`);
    }

    return updatedShift;
  }

  async remove(id: string): Promise<Shift> {
    const deletedShift = await this.shiftModel.findByIdAndDelete(id).exec();
    if (!deletedShift) {
      throw new NotFoundException(`Shift with ID ${id} not found`);
    }
    return deletedShift;
  }

  async assignEmployee(shiftId: string, assignEmployeeDto: AssignEmployeeDto): Promise<Shift> {
    const shift = await this.shiftModel.findById(shiftId).exec();
    if (!shift) {
      throw new NotFoundException(`Shift with ID ${shiftId} not found`);
    }

    const employee = await this.employeeModel.findById(assignEmployeeDto.employeeId).exec();
    if (!employee) {
      throw new NotFoundException(`Employee with ID ${assignEmployeeDto.employeeId} not found`);
    }

    // Check if shift is at capacity
    if (shift.assignedEmployees.length >= shift.capacity) {
      throw new BadRequestException('Shift is at full capacity');
    }

    // Check if employee is already assigned
    const employeeId = new Types.ObjectId(assignEmployeeDto.employeeId);
    if (shift.assignedEmployees.some(id => id.equals(employeeId))) {
      throw new BadRequestException('Employee is already assigned to this shift');
    }

    // Check employee availability
    const dayOfWeek = moment(shift.date).format('dddd').toLowerCase();
    const isAvailable = employee.availability.some(slot =>
      slot.day === dayOfWeek &&
      slot.startTime <= shift.startTime &&
      slot.endTime >= shift.endTime
    );

    if (!isAvailable) {
      throw new BadRequestException('Employee is not available for this shift time');
    }

    shift.assignedEmployees.push(employeeId);
    await shift.save();

    return this.findOne(shiftId);
  }

  async unassignEmployee(shiftId: string, employeeId: string): Promise<Shift> {
    const shift = await this.shiftModel.findById(shiftId).exec();
    if (!shift) {
      throw new NotFoundException(`Shift with ID ${shiftId} not found`);
    }

    const employeeObjectId = new Types.ObjectId(employeeId);
    const index = shift.assignedEmployees.findIndex(id => id.equals(employeeObjectId));

    if (index === -1) {
      throw new BadRequestException('Employee is not assigned to this shift');
    }

    shift.assignedEmployees.splice(index, 1);
    await shift.save();

    return this.findOne(shiftId);
  }

  async publishShift(id: string): Promise<Shift> {
    return this.update(id, { status: ShiftStatus.PUBLISHED });
  }

  async getShiftHours(shiftId: string): Promise<number> {
    const shift = await this.findOne(shiftId);
    const startTime = moment(shift.startTime, 'HH:mm');
    const endTime = moment(shift.endTime, 'HH:mm');

    // Handle overnight shifts
    if (endTime.isBefore(startTime)) {
      endTime.add(1, 'day');
    }

    return endTime.diff(startTime, 'hours', true);
  }

  private isValidTimeFormat(time: string): boolean {
    return /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(time);
  }

  private async createYearlyRecurringShifts(baseShift: Shift, targetDayOfWeek: string): Promise<void> {
    const startDate = moment(baseShift.date);
    const endDate = moment(startDate).endOf('year'); // Create shifts until end of current year

    const shifts = [];
    const currentDate = moment(startDate).add(1, 'day'); // Start from next day

    console.log(`🔄 Creating yearly recurring shifts for ${targetDayOfWeek}s from ${startDate.format('YYYY-MM-DD')} to ${endDate.format('YYYY-MM-DD')}`);

    while (currentDate.isBefore(endDate) || currentDate.isSame(endDate, 'day')) {
      const dayName = currentDate.format('dddd').toLowerCase();

      if (dayName === targetDayOfWeek) {
        shifts.push({
          date: currentDate.toDate(),
          startTime: baseShift.startTime,
          endTime: baseShift.endTime,
          name: baseShift.name,
          capacity: baseShift.capacity,
          manager: baseShift.manager,
          description: baseShift.description,
          isRecurring: false, // Prevent infinite recursion
          status: ShiftStatus.DRAFT,
        });
      }

      currentDate.add(1, 'day');
    }

    if (shifts.length > 0) {
      console.log(`✅ Creating ${shifts.length} recurring shifts for ${targetDayOfWeek}s`);
      await this.shiftModel.insertMany(shifts);
    }
  }

  private async createRecurringShifts(baseShift: Shift, recurringDays: string[]): Promise<void> {
    const startDate = moment(baseShift.date);
    const endDate = moment(startDate).add(3, 'months'); // Create shifts for next 3 months

    const shifts = [];
    const currentDate = moment(startDate).add(1, 'day');

    while (currentDate.isBefore(endDate)) {
      const dayName = currentDate.format('dddd').toLowerCase();

      if (recurringDays.includes(dayName)) {
        shifts.push({
          date: currentDate.toDate(),
          startTime: baseShift.startTime,
          endTime: baseShift.endTime,
          name: baseShift.name,
          capacity: baseShift.capacity,
          manager: baseShift.manager,
          description: baseShift.description,
          isRecurring: false, // Prevent infinite recursion
          status: ShiftStatus.DRAFT,
        });
      }

      currentDate.add(1, 'day');
    }

    if (shifts.length > 0) {
      await this.shiftModel.insertMany(shifts);
    }
  }
}
