import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ShiftsService } from './shifts.service';
import { ShiftsController } from './shifts.controller';
import { Shift, ShiftSchema } from '../schemas/shift.schema';
import { Employee, EmployeeSchema } from '../schemas/employee.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Shift.name, schema: ShiftSchema },
      { name: Employee.name, schema: EmployeeSchema },
    ]),
  ],
  controllers: [ShiftsController],
  providers: [ShiftsService],
  exports: [ShiftsService],
})
export class ShiftsModule {}
