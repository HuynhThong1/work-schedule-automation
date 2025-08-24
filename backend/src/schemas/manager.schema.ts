import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ManagerDocument = Manager & Document;

export enum ManagerLevel {
  MIDDLE = 'middle',
  SENIOR = 'senior',
}

@Schema({ timestamps: true })
export class Manager {
  @Prop({ required: true, unique: true })
  code: string;

  @Prop({ required: true })
  name: string;

  @Prop({ required: true, enum: ManagerLevel })
  level: ManagerLevel;

  @Prop({ default: true })
  isActive: boolean;

  @Prop()
  email?: string;

  @Prop()
  phone?: string;
}

export const ManagerSchema = SchemaFactory.createForClass(Manager);
