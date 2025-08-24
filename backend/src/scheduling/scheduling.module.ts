import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SchedulingService } from './scheduling.service';
import { SchedulingController } from './scheduling.controller';
import { Schedule, ScheduleSchema } from '../schemas/schedule.schema';
import { Shift, ShiftSchema } from '../schemas/shift.schema';
import { Employee, EmployeeSchema } from '../schemas/employee.schema';
import { Rule, RuleSchema } from '../schemas/rule.schema';
import { ShiftRequest, ShiftRequestSchema } from '../schemas/shift-request.schema';
import { RulesModule } from '../rules/rules.module';
import { ShiftsModule } from '../shifts/shifts.module';
import { EmployeesModule } from '../employees/employees.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Schedule.name, schema: ScheduleSchema },
      { name: Shift.name, schema: ShiftSchema },
      { name: Employee.name, schema: EmployeeSchema },
      { name: Rule.name, schema: RuleSchema },
      { name: ShiftRequest.name, schema: ShiftRequestSchema },
    ]),
    RulesModule,
    ShiftsModule,
    EmployeesModule,
  ],
  controllers: [SchedulingController],
  providers: [SchedulingService],
  exports: [SchedulingService],
})
export class SchedulingModule {}
