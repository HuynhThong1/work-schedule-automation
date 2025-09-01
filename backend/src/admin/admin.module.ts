import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AdminController } from './admin.controller';
import { ProductionSeedService } from '../seeds/production-seed';
import { Employee, EmployeeSchema } from '../schemas/employee.schema';
import { Manager, ManagerSchema } from '../schemas/manager.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Employee.name, schema: EmployeeSchema },
      { name: Manager.name, schema: ManagerSchema },
    ]),
  ],
  controllers: [AdminController],
  providers: [ProductionSeedService],
})
export class AdminModule {}
