import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from '../database/database.module';
import { AuthModule } from '../auth/auth.module';
import { EmployeesModule } from '../employees/employees.module';
import { ManagersModule } from '../managers/managers.module';
import { ShiftsModule } from '../shifts/shifts.module';
import { RulesModule } from '../rules/rules.module';
import { SchedulingModule } from '../scheduling/scheduling.module';
import { TimesheetsModule } from '../timesheets/timesheets.module';
import { ShiftRequestsModule } from '../shift-requests/shift-requests.module';
import { SeedService } from '../seeds/seed-data';
import { MongooseModule } from '@nestjs/mongoose';
import { Employee, EmployeeSchema } from '../schemas/employee.schema';
import { Manager, ManagerSchema } from '../schemas/manager.schema';
import { Rule, RuleSchema } from '../schemas/rule.schema';
import { Shift, ShiftSchema } from '../schemas/shift.schema';
import configuration from '../config/configuration';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    ScheduleModule.forRoot(),
    DatabaseModule,
    AuthModule,
    EmployeesModule,
    ManagersModule,
    ShiftsModule,
    RulesModule,
    SchedulingModule,
    TimesheetsModule,
    ShiftRequestsModule,
    MongooseModule.forFeature([
      { name: Employee.name, schema: EmployeeSchema },
      { name: Manager.name, schema: ManagerSchema },
      { name: Rule.name, schema: RuleSchema },
      { name: Shift.name, schema: ShiftSchema },
    ]),
  ],
  controllers: [AppController],
  providers: [AppService, SeedService],
})
export class AppModule {}
