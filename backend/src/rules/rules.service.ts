import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { IsString, IsOptional, IsBoolean, IsNumber, IsArray, IsEnum, IsObject } from 'class-validator';
import { Rule, RuleDocument, RuleType, RuleParameters } from '../schemas/rule.schema';

export class CreateRuleDto {
  @IsString()
  name: string;

  @IsString()
  description: string;

  @IsEnum(RuleType)
  type: RuleType;

  @IsObject()
  parameters: RuleParameters;

  @IsOptional()
  @IsNumber()
  priority?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  applicableShiftTypes?: string[];

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateRuleDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(RuleType)
  type?: RuleType;

  @IsOptional()
  @IsObject()
  parameters?: RuleParameters;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsNumber()
  priority?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  applicableShiftTypes?: string[];
}

@Injectable()
export class RulesService {
  constructor(
    @InjectModel(Rule.name) private ruleModel: Model<RuleDocument>,
  ) {}

  async create(createRuleDto: CreateRuleDto): Promise<Rule> {
    const rule = new this.ruleModel(createRuleDto);
    return rule.save();
  }

  async findAll(): Promise<Rule[]> {
    return this.ruleModel.find().sort({ priority: -1, name: 1 }).exec();
  }

  async findActive(): Promise<Rule[]> {
    return this.ruleModel
      .find({ isActive: true })
      .sort({ priority: -1, name: 1 })
      .exec();
  }

  async findByType(type: RuleType): Promise<Rule[]> {
    return this.ruleModel
      .find({ type, isActive: true })
      .sort({ priority: -1, name: 1 })
      .exec();
  }

  async findOne(id: string): Promise<Rule> {
    const rule = await this.ruleModel.findById(id).exec();
    if (!rule) {
      throw new NotFoundException(`Rule with ID ${id} not found`);
    }
    return rule;
  }

  async update(id: string, updateRuleDto: UpdateRuleDto): Promise<Rule> {
    const updatedRule = await this.ruleModel
      .findByIdAndUpdate(id, updateRuleDto, { new: true })
      .exec();
    if (!updatedRule) {
      throw new NotFoundException(`Rule with ID ${id} not found`);
    }
    return updatedRule;
  }

  async remove(id: string): Promise<Rule> {
    const deletedRule = await this.ruleModel.findByIdAndDelete(id).exec();
    if (!deletedRule) {
      throw new NotFoundException(`Rule with ID ${id} not found`);
    }
    return deletedRule;
  }

  async activate(id: string): Promise<Rule> {
    return this.update(id, { isActive: true });
  }

  async deactivate(id: string): Promise<Rule> {
    return this.update(id, { isActive: false });
  }

  async getAssignmentRules(): Promise<Rule[]> {
    return this.findByType(RuleType.ASSIGNMENT);
  }

  async getConstraintRules(): Promise<Rule[]> {
    return this.findByType(RuleType.CONSTRAINT);
  }

  async getPriorityRules(): Promise<Rule[]> {
    return this.findByType(RuleType.PRIORITY);
  }

  // Rule validation methods
  async validateRule(rule: Rule, context: any): Promise<boolean> {
    switch (rule.type) {
      case RuleType.CONSTRAINT:
        return this.validateConstraintRule(rule, context);
      case RuleType.ASSIGNMENT:
        return this.validateAssignmentRule(rule, context);
      case RuleType.PRIORITY:
        return this.validatePriorityRule(rule, context);
      default:
        return true;
    }
  }

  private validateConstraintRule(rule: Rule, context: any): boolean {
    const { parameters } = rule;

    // Minimum staff per shift
    if (parameters.minimumStaff && context.assignedEmployees) {
      return context.assignedEmployees.length >= parameters.minimumStaff;
    }

    // Maximum hours per week
    if (parameters.maxHoursFullTime || parameters.maxHoursPartTime) {
      const employee = context.employee;
      const weeklyHours = context.weeklyHours || 0;

      if (employee?.fullTime && parameters.maxHoursFullTime) {
        return weeklyHours <= parameters.maxHoursFullTime;
      }

      if (!employee?.fullTime && parameters.maxHoursPartTime) {
        return weeklyHours <= parameters.maxHoursPartTime;
      }
    }

    return true;
  }

  private validateAssignmentRule(rule: Rule, context: any): boolean {
    const { parameters } = rule;

    // Respect availability
    if (parameters.respectAvailability && context.employee && context.shift) {
      const { employee, shift } = context;
      const dayOfWeek = new Date(shift.date).toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();

      return employee.availability.some((slot: any) =>
        slot.day === dayOfWeek &&
        slot.startTime <= shift.startTime &&
        slot.endTime >= shift.endTime
      );
    }

    return true;
  }

  private validatePriorityRule(rule: Rule, context: any): boolean {
    // Priority rules don't validate, they just influence selection
    return true;
  }

  // Rule application methods
  async applyPriorityRules(employees: any[], rules: Rule[]): Promise<any[]> {
    if (!rules.length) return employees;

    return employees.sort((a, b) => {
      for (const rule of rules) {
        const scoreA = this.calculatePriorityScore(a, rule);
        const scoreB = this.calculatePriorityScore(b, rule);

        if (scoreA !== scoreB) {
          return scoreB - scoreA; // Higher score first
        }
      }
      return 0;
    });
  }

  private calculatePriorityScore(employee: any, rule: Rule): number {
    const { parameters } = rule;
    let score = 0;

    if (parameters.priorityOrder && Array.isArray(parameters.priorityOrder)) {
      const index = parameters.priorityOrder.indexOf(employee.type);
      if (index !== -1) {
        score += (parameters.priorityOrder.length - index) * (parameters.weight || 1);
      }
    }

    return score;
  }
}
