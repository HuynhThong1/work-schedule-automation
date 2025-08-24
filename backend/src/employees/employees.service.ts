import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { IsString, IsBoolean, IsNumber, IsOptional, IsEmail, IsIn, IsArray } from 'class-validator';
import { Employee, EmployeeDocument, AvailabilitySlot } from '../schemas/employee.schema';

export class CreateEmployeeDto {
  @IsString()
  code: string;

  @IsString()
  name: string;

  @IsString()
  @IsIn(['new', 'junior'])
  type: 'new' | 'junior';

  @IsBoolean()
  fullTime: boolean;

  @IsNumber()
  salaryByHour: number;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsNumber()
  maxHoursPerWeek?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsArray()
  availability?: AvailabilitySlot[];
}

export class UpdateEmployeeDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  @IsIn(['new', 'junior'])
  type?: 'new' | 'junior';

  @IsOptional()
  @IsBoolean()
  fullTime?: boolean;

  @IsOptional()
  @IsNumber()
  salaryByHour?: number;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsNumber()
  maxHoursPerWeek?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsArray()
  availability?: AvailabilitySlot[];
}

export class UpdateAvailabilityDto {
  availability: AvailabilitySlot[];
}

@Injectable()
export class EmployeesService {
  constructor(
    @InjectModel(Employee.name) private employeeModel: Model<EmployeeDocument>,
  ) {}

  async create(createEmployeeDto: CreateEmployeeDto): Promise<Employee> {
    const createdEmployee = new this.employeeModel(createEmployeeDto);
    return createdEmployee.save();
  }

  async findAll(): Promise<Employee[]> {
    return this.employeeModel.find({ isActive: true }).exec();
  }

  async findOne(id: string): Promise<Employee> {
    const employee = await this.employeeModel.findById(id).exec();
    if (!employee) {
      throw new NotFoundException(`Employee with ID ${id} not found`);
    }
    return employee;
  }

  async findByCode(code: string): Promise<Employee> {
    const employee = await this.employeeModel.findOne({ code, isActive: true }).exec();
    if (!employee) {
      throw new NotFoundException(`Employee with code ${code} not found`);
    }
    return employee;
  }

  async update(id: string, updateEmployeeDto: UpdateEmployeeDto): Promise<Employee> {
    const updatedEmployee = await this.employeeModel
      .findByIdAndUpdate(id, updateEmployeeDto, { new: true })
      .exec();
    if (!updatedEmployee) {
      throw new NotFoundException(`Employee with ID ${id} not found`);
    }
    return updatedEmployee;
  }

  async updateAvailability(id: string, updateAvailabilityDto: UpdateAvailabilityDto): Promise<Employee> {
    const updatedEmployee = await this.employeeModel
      .findByIdAndUpdate(id, { availability: updateAvailabilityDto.availability }, { new: true })
      .exec();
    if (!updatedEmployee) {
      throw new NotFoundException(`Employee with ID ${id} not found`);
    }
    return updatedEmployee;
  }

  async remove(id: string): Promise<Employee> {
    const deletedEmployee = await this.employeeModel
      .findByIdAndUpdate(id, { isActive: false }, { new: true })
      .exec();
    if (!deletedEmployee) {
      throw new NotFoundException(`Employee with ID ${id} not found`);
    }
    return deletedEmployee;
  }

  async findAvailableEmployees(date: Date, startTime: string, endTime: string): Promise<Employee[]> {
    const dayOfWeek = date.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();

    return this.employeeModel.find({
      isActive: true,
      'availability.day': dayOfWeek,
      'availability.startTime': { $lte: startTime },
      'availability.endTime': { $gte: endTime },
    }).exec();
  }
}
