import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type RuleDocument = Rule & Document;

export enum RuleType {
  ASSIGNMENT = 'assignment', // How to assign employees to shifts
  CONSTRAINT = 'constraint', // Constraints on scheduling
  PRIORITY = 'priority', // Priority rules
}

export interface RuleParameters {
  [key: string]: any;
}

@Schema({ timestamps: true })
export class Rule {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  description: string;

  @Prop({ required: true, enum: RuleType })
  type: RuleType;

  @Prop({ type: Object, required: true })
  parameters: RuleParameters;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ default: 0 })
  priority: number; // Higher number = higher priority

  @Prop({ type: [String], default: [] })
  applicableShiftTypes: string[]; // Which shift types this rule applies to
}

export const RuleSchema = SchemaFactory.createForClass(Rule);
