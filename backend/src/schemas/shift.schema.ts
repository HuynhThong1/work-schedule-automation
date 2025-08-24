import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ShiftDocument = Shift & Document;

export enum ShiftStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

@Schema({ timestamps: true })
export class Shift {
  @Prop({ required: true })
  date: Date;

  @Prop({ required: true })
  startTime: string; // '09:00'

  @Prop({ required: true })
  endTime: string; // '17:00'

  @Prop({ required: true })
  name: string; // 'Morning Shift', 'Afternoon Shift', etc.

  @Prop({ required: true, min: 1 })
  capacity: number; // Maximum number of employees

  @Prop({ type: [Types.ObjectId], ref: 'Employee', default: [] })
  assignedEmployees: Types.ObjectId[];

  @Prop({ type: Types.ObjectId, ref: 'Manager' })
  manager: Types.ObjectId;

  @Prop({ enum: ShiftStatus, default: ShiftStatus.DRAFT })
  status: ShiftStatus;

  @Prop()
  description?: string;

  @Prop({ default: false })
  isRecurring: boolean;

  @Prop({ type: [String], default: [] })
  recurringDays: string[]; // ['monday', 'tuesday', etc.]
}

export const ShiftSchema = SchemaFactory.createForClass(Shift);
