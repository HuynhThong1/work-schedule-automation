import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type TimesheetDocument = Timesheet & Document;

export interface WorkedShift {
  shiftId: Types.ObjectId;
  date: Date;
  startTime: string;
  endTime: string;
  hoursWorked: number;
  hourlyRate: number;
  totalPay: number;
}

@Schema({ timestamps: true })
export class Timesheet {
  @Prop({ type: Types.ObjectId, ref: 'Employee', required: true })
  employeeId: Types.ObjectId;

  @Prop({ required: true })
  month: number; // 1-12

  @Prop({ required: true })
  year: number;

  @Prop({ type: [Object], default: [] })
  workedShifts: WorkedShift[];

  @Prop({ required: true, default: 0 })
  totalHours: number;

  @Prop({ required: true, default: 0 })
  totalPay: number;

  @Prop({ default: false })
  isFinalized: boolean;

  @Prop()
  finalizedAt?: Date;

  @Prop({ type: Types.ObjectId, ref: 'Manager' })
  finalizedBy?: Types.ObjectId;
}

export const TimesheetSchema = SchemaFactory.createForClass(Timesheet);

// Create compound index for employee, month, and year
TimesheetSchema.index({ employeeId: 1, month: 1, year: 1 }, { unique: true });
