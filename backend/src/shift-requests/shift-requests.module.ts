import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ShiftRequestsService } from './shift-requests.service';
import { ShiftRequestsController } from './shift-requests.controller';
import { ShiftRequest, ShiftRequestSchema } from '../schemas/shift-request.schema';
import { Employee, EmployeeSchema } from '../schemas/employee.schema';
import { Shift, ShiftSchema } from '../schemas/shift.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ShiftRequest.name, schema: ShiftRequestSchema },
      { name: Employee.name, schema: EmployeeSchema },
      { name: Shift.name, schema: ShiftSchema },
    ]),
  ],
  controllers: [ShiftRequestsController],
  providers: [ShiftRequestsService],
  exports: [ShiftRequestsService],
})
export class ShiftRequestsModule {}
