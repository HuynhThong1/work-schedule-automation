import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  UseGuards,
  Request,
  Query,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { TimesheetsService, FinalizeTimesheetDto } from './timesheets.service';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';

@Controller('timesheets')
@UseGuards(AuthGuard('jwt'))
export class TimesheetsController {
  constructor(private readonly timesheetsService: TimesheetsService) {}

  @Post('calculate/:employeeId')
  @Roles('manager')
  @UseGuards(RolesGuard)
  calculateTimesheet(
    @Param('employeeId') employeeId: string,
    @Body('year') year: number,
    @Body('month') month: number,
  ) {
    return this.timesheetsService.calculateTimesheet(employeeId, year, month);
  }

  @Post('calculate-all')
  @Roles('manager')
  @UseGuards(RolesGuard)
  calculateAllTimesheets(@Body('year') year: number, @Body('month') month: number) {
    return this.timesheetsService.calculateAllTimesheets(year, month);
  }

  @Get()
  findAll(@Query('year') year?: string, @Query('month') month?: string, @Request() req?) {
    // Employees can only see their own timesheets
    if (req.user.role === 'employee') {
      return this.timesheetsService.findByEmployee(
        req.user.sub,
        year ? parseInt(year) : undefined,
        month ? parseInt(month) : undefined,
      );
    }

    return this.timesheetsService.findAll(
      year ? parseInt(year) : undefined,
      month ? parseInt(month) : undefined,
    );
  }

  @Get('employee/:employeeId')
  @Roles('manager')
  @UseGuards(RolesGuard)
  findByEmployee(
    @Param('employeeId') employeeId: string,
    @Query('year') year?: string,
    @Query('month') month?: string,
  ) {
    return this.timesheetsService.findByEmployee(
      employeeId,
      year ? parseInt(year) : undefined,
      month ? parseInt(month) : undefined,
    );
  }

  @Get('my-timesheet')
  getMyTimesheet(@Request() req, @Query('year') year?: string, @Query('month') month?: string) {
    if (req.user.role !== 'employee') {
      return { message: 'Only employees can access this endpoint' };
    }

    return this.timesheetsService.findByEmployee(
      req.user.sub,
      year ? parseInt(year) : undefined,
      month ? parseInt(month) : undefined,
    );
  }

  @Get('summary/:employeeId')
  getEmployeeSummary(
    @Param('employeeId') employeeId: string,
    @Query('year') year: string,
    @Query('month') month: string,
    @Request() req?,
  ) {
    // Employees can only see their own summary
    if (req.user.role === 'employee' && req.user.sub !== employeeId) {
      return { message: 'Access denied' };
    }

    return this.timesheetsService.getEmployeeMonthlySummary(
      employeeId,
      parseInt(year),
      parseInt(month),
    );
  }

  @Get('payroll-summary')
  @Roles('manager')
  @UseGuards(RolesGuard)
  getPayrollSummary(@Query('year') year: string, @Query('month') month: string) {
    return this.timesheetsService.getPayrollSummary(parseInt(year), parseInt(month));
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Request() req) {
    // TODO: Add authorization check for employees to only see their own timesheets
    return this.timesheetsService.findOne(id);
  }

  @Patch(':id/finalize')
  @Roles('manager')
  @UseGuards(RolesGuard)
  finalize(@Param('id') id: string, @Request() req) {
    return this.timesheetsService.finalizeTimesheet(id, { finalizedBy: req.user.sub });
  }

  @Patch(':id/unfinalize')
  @Roles('manager')
  @UseGuards(RolesGuard)
  unfinalize(@Param('id') id: string) {
    return this.timesheetsService.unfinalizeTimesheet(id);
  }
}
