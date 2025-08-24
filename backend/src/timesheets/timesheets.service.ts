import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Cron, CronExpression } from '@nestjs/schedule';
import { IsString } from 'class-validator';
import moment from 'moment';

import { Timesheet, TimesheetDocument, WorkedShift } from '../schemas/timesheet.schema';
import { Shift, ShiftDocument, ShiftStatus } from '../schemas/shift.schema';
import { Employee, EmployeeDocument } from '../schemas/employee.schema';

export class FinalizeTimesheetDto {
  @IsString()
  finalizedBy: string;
}

@Injectable()
export class TimesheetsService {
  constructor(
    @InjectModel(Timesheet.name) private timesheetModel: Model<TimesheetDocument>,
    @InjectModel(Shift.name) private shiftModel: Model<ShiftDocument>,
    @InjectModel(Employee.name) private employeeModel: Model<EmployeeDocument>,
  ) {}

  // Run on the 1st of every month at 2 AM to calculate previous month's timesheets
  @Cron('0 2 1 * *', {
    name: 'calculateMonthlyTimesheets',
    timeZone: 'Asia/Ho_Chi_Minh',
  })
  async handleMonthlyTimesheetCalculation() {
    console.log('📊 Calculating monthly timesheets...');

    const lastMonth = moment().subtract(1, 'month');
    const year = lastMonth.year();
    const month = lastMonth.month() + 1; // moment months are 0-indexed

    try {
      await this.calculateAllTimesheets(year, month);
      console.log(`✅ Timesheets calculated for ${lastMonth.format('MMMM YYYY')}`);
    } catch (error) {
      console.error('❌ Failed to calculate monthly timesheets:', error);
    }
  }

  async calculateTimesheet(employeeId: string, year: number, month: number): Promise<Timesheet> {
    const employee = await this.employeeModel.findById(employeeId).exec();
    if (!employee) {
      throw new NotFoundException(`Employee with ID ${employeeId} not found`);
    }

    // Get date range for the month
    const startDate = moment({ year, month: month - 1, day: 1 }).startOf('day').toDate();
    const endDate = moment({ year, month: month - 1 }).endOf('month').endOf('day').toDate();

    // Find all completed shifts for this employee in the month
    const shifts = await this.shiftModel
      .find({
        date: { $gte: startDate, $lte: endDate },
        assignedEmployees: new Types.ObjectId(employeeId),
        status: ShiftStatus.COMPLETED,
      })
      .exec();

    // Calculate worked shifts
    const workedShifts: WorkedShift[] = [];
    let totalHours = 0;
    let totalPay = 0;

    for (const shift of shifts) {
      const hoursWorked = this.calculateShiftHours(shift.startTime, shift.endTime);
      const shiftPay = hoursWorked * employee.salaryByHour;

      workedShifts.push({
        shiftId: shift._id as Types.ObjectId,
        date: shift.date as Date,
        startTime: shift.startTime as string,
        endTime: shift.endTime as string,
        hoursWorked,
        hourlyRate: employee.salaryByHour,
        totalPay: shiftPay,
      });

      totalHours += hoursWorked;
      totalPay += shiftPay;
    }

    // Check if timesheet already exists
    const existingTimesheet = await this.timesheetModel
      .findOne({ employeeId: new Types.ObjectId(employeeId), year, month })
      .exec();

    if (existingTimesheet) {
      // Update existing timesheet
      existingTimesheet.workedShifts = workedShifts;
      existingTimesheet.totalHours = totalHours;
      existingTimesheet.totalPay = totalPay;
      return existingTimesheet.save();
    } else {
      // Create new timesheet
      const timesheet = new this.timesheetModel({
        employeeId: new Types.ObjectId(employeeId),
        year,
        month,
        workedShifts,
        totalHours,
        totalPay,
      });
      return timesheet.save();
    }
  }

  async calculateAllTimesheets(year: number, month: number): Promise<Timesheet[]> {
    const employees = await this.employeeModel.find({ isActive: true }).exec();
    const timesheets: Timesheet[] = [];

    for (const employee of employees) {
      try {
        const timesheet = await this.calculateTimesheet(employee._id.toString(), year, month);
        timesheets.push(timesheet);
      } catch (error) {
        console.error(`Failed to calculate timesheet for employee ${employee.code}:`, error);
      }
    }

    return timesheets;
  }

  async findAll(year?: number, month?: number): Promise<Timesheet[]> {
    const filter: any = {};
    if (year) filter.year = year;
    if (month) filter.month = month;

    return this.timesheetModel
      .find(filter)
      .populate('employeeId', 'name code type salaryByHour')
      .populate('finalizedBy', 'name code level')
      .sort({ year: -1, month: -1, 'employeeId.name': 1 })
      .exec();
  }

  async findByEmployee(employeeId: string, year?: number, month?: number): Promise<Timesheet[]> {
    const filter: any = { employeeId: new Types.ObjectId(employeeId) };
    if (year) filter.year = year;
    if (month) filter.month = month;

    return this.timesheetModel
      .find(filter)
      .populate('employeeId', 'name code type salaryByHour')
      .populate('finalizedBy', 'name code level')
      .sort({ year: -1, month: -1 })
      .exec();
  }

  async findOne(id: string): Promise<Timesheet> {
    const timesheet = await this.timesheetModel
      .findById(id)
      .populate('employeeId', 'name code type salaryByHour')
      .populate('finalizedBy', 'name code level')
      .exec();

    if (!timesheet) {
      throw new NotFoundException(`Timesheet with ID ${id} not found`);
    }

    return timesheet;
  }

  async findByEmployeeAndMonth(employeeId: string, year: number, month: number): Promise<Timesheet | null> {
    return this.timesheetModel
      .findOne({
        employeeId: new Types.ObjectId(employeeId),
        year,
        month,
      })
      .populate('employeeId', 'name code type salaryByHour')
      .populate('finalizedBy', 'name code level')
      .exec();
  }

  async finalizeTimesheet(id: string, finalizeDto: FinalizeTimesheetDto): Promise<Timesheet> {
    const timesheet = await this.timesheetModel
      .findByIdAndUpdate(
        id,
        {
          isFinalized: true,
          finalizedAt: new Date(),
          finalizedBy: new Types.ObjectId(finalizeDto.finalizedBy),
        },
        { new: true }
      )
      .populate('employeeId', 'name code type salaryByHour')
      .populate('finalizedBy', 'name code level')
      .exec();

    if (!timesheet) {
      throw new NotFoundException(`Timesheet with ID ${id} not found`);
    }

    return timesheet;
  }

  async unfinalizeTimesheet(id: string): Promise<Timesheet> {
    const timesheet = await this.timesheetModel
      .findByIdAndUpdate(
        id,
        {
          isFinalized: false,
          $unset: { finalizedAt: 1, finalizedBy: 1 },
        },
        { new: true }
      )
      .populate('employeeId', 'name code type salaryByHour')
      .exec();

    if (!timesheet) {
      throw new NotFoundException(`Timesheet with ID ${id} not found`);
    }

    return timesheet;
  }

  async getEmployeeMonthlySummary(employeeId: string, year: number, month: number) {
    const timesheet = await this.findByEmployeeAndMonth(employeeId, year, month);

    if (!timesheet) {
      return {
        totalHours: 0,
        totalPay: 0,
        shiftsWorked: 0,
        averageHoursPerShift: 0,
        isFinalized: false,
      };
    }

    return {
      totalHours: timesheet.totalHours,
      totalPay: timesheet.totalPay,
      shiftsWorked: timesheet.workedShifts.length,
      averageHoursPerShift: timesheet.workedShifts.length > 0
        ? timesheet.totalHours / timesheet.workedShifts.length
        : 0,
      isFinalized: timesheet.isFinalized,
      finalizedAt: timesheet.finalizedAt,
    };
  }

  async getPayrollSummary(year: number, month: number) {
    const timesheets = await this.findAll(year, month);

    const summary = {
      totalEmployees: timesheets.length,
      totalHours: 0,
      totalPayroll: 0,
      finalizedCount: 0,
      pendingCount: 0,
      byEmployeeType: {
        new: { count: 0, totalHours: 0, totalPay: 0 },
        junior: { count: 0, totalHours: 0, totalPay: 0 },
      },
    };

    for (const timesheet of timesheets) {
      summary.totalHours += timesheet.totalHours;
      summary.totalPayroll += timesheet.totalPay;

      if (timesheet.isFinalized) {
        summary.finalizedCount++;
      } else {
        summary.pendingCount++;
      }

      const employeeType = (timesheet.employeeId as any).type;
      if (summary.byEmployeeType[employeeType]) {
        summary.byEmployeeType[employeeType].count++;
        summary.byEmployeeType[employeeType].totalHours += timesheet.totalHours;
        summary.byEmployeeType[employeeType].totalPay += timesheet.totalPay;
      }
    }

    return summary;
  }

  private calculateShiftHours(startTime: string, endTime: string): number {
    const start = moment(startTime, 'HH:mm');
    const end = moment(endTime, 'HH:mm');

    // Handle overnight shifts
    if (end.isBefore(start)) {
      end.add(1, 'day');
    }

    return end.diff(start, 'hours', true);
  }
}
