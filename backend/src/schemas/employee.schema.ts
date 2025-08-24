import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type EmployeeDocument = Employee & Document;

export enum EmployeeType {
  NEW = 'new',
  JUNIOR = 'junior',
}

export interface AvailabilitySlot {
  day: string; // 'monday', 'tuesday', etc.
  startTime: string; // '09:00'
  endTime: string; // '17:00'
}

@Schema({ timestamps: true })
export class Employee {
  @Prop({ required: true, unique: true })
  code: string;

  @Prop({ required: true })
  name: string;

  @Prop({ required: true, enum: EmployeeType })
  type: EmployeeType;

  @Prop({ required: true })
  fullTime: boolean;

  @Prop({ required: true })
  salaryByHour: number;

  @Prop({ type: [Object], default: [] })
  availability?: AvailabilitySlot[];

  @Prop({ default: true })
  isActive: boolean;

  @Prop()
  email?: string;

  @Prop()
  phone?: string;

  @Prop({ default: 0 })
  maxHoursPerWeek?: number;
}

export const EmployeeSchema = SchemaFactory.createForClass(Employee);
