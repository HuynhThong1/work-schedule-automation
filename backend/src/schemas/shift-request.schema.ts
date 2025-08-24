import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ShiftRequestDocument = ShiftRequest & Document;

export enum RequestStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  CANCELLED = 'cancelled',
}

export enum RequestType {
  REQUEST = 'request', // Employee requests a shift
  SWAP = 'swap', // Employee wants to swap shifts
  DROP = 'drop', // Employee wants to drop a shift
  PICKUP = 'pickup', // Employee wants to pickup a shift
}

@Schema({ timestamps: true })
export class ShiftRequest {
  @Prop({ type: Types.ObjectId, ref: 'Employee', required: true })
  employeeId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Shift', required: false })
  shiftId?: Types.ObjectId;

  @Prop({ enum: RequestType, required: true })
  type: RequestType;

  @Prop({ enum: RequestStatus, default: RequestStatus.PENDING })
  status: RequestStatus;

  @Prop()
  reason?: string;

  @Prop({ type: Types.ObjectId, ref: 'Manager' })
  reviewedBy?: Types.ObjectId;

  @Prop()
  reviewedAt?: Date;

  @Prop()
  reviewNotes?: string;

  // For swap requests
  @Prop({ type: Types.ObjectId, ref: 'Shift' })
  targetShiftId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Employee' })
  swapWithEmployeeId?: Types.ObjectId;

  // For direct shift requests (when no existing shift)
  @Prop()
  date?: Date;

  @Prop()
  startTime?: string;

  @Prop()
  endTime?: string;
}

export const ShiftRequestSchema = SchemaFactory.createForClass(ShiftRequest);
