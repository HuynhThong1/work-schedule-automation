import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TimesheetsService } from './timesheets.service';
import { TimesheetsController } from './timesheets.controller';
import { Timesheet, TimesheetSchema } from '../schemas/timesheet.schema';
import { Shift, ShiftSchema } from '../schemas/shift.schema';
import { Employee, EmployeeSchema } from '../schemas/employee.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Timesheet.name, schema: TimesheetSchema },
      { name: Shift.name, schema: ShiftSchema },
      { name: Employee.name, schema: EmployeeSchema },
    ]),
  ],
  controllers: [TimesheetsController],
  providers: [TimesheetsService],
  exports: [TimesheetsService],
})
export class TimesheetsModule {}
