import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ScheduleDocument = Schedule & Document;

export enum ScheduleStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  ARCHIVED = 'archived',
}

@Schema({ timestamps: true })
export class Schedule {
  @Prop({ required: true })
  startDate: Date;

  @Prop({ required: true })
  endDate: Date;

  @Prop({ required: true })
  name: string; // 'Week 1 January 2025', 'Monthly Schedule January 2025'

  @Prop({ type: [Types.ObjectId], ref: 'Shift', default: [] })
  shifts: Types.ObjectId[];

  @Prop({ enum: ScheduleStatus, default: ScheduleStatus.DRAFT })
  status: ScheduleStatus;

  @Prop({ type: Types.ObjectId, ref: 'Manager', required: true })
  createdBy: Types.ObjectId;

  @Prop()
  notes?: string;

  @Prop({ default: false })
  isTemplate: boolean;
}

export const ScheduleSchema = SchemaFactory.createForClass(Schedule);
