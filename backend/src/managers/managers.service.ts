import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { IsString, IsOptional, IsBoolean, IsEmail, IsIn } from 'class-validator';
import { Manager, ManagerDocument } from '../schemas/manager.schema';

export class CreateManagerDto {
  @IsString()
  code: string;

  @IsString()
  name: string;

  @IsString()
  @IsIn(['middle', 'senior'])
  level: 'middle' | 'senior';

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateManagerDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  @IsIn(['middle', 'senior'])
  level?: 'middle' | 'senior';

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

@Injectable()
export class ManagersService {
  constructor(
    @InjectModel(Manager.name) private managerModel: Model<ManagerDocument>,
  ) {}

  async create(createManagerDto: CreateManagerDto): Promise<Manager> {
    const createdManager = new this.managerModel(createManagerDto);
    return createdManager.save();
  }

  async findAll(): Promise<Manager[]> {
    return this.managerModel.find({ isActive: true }).exec();
  }

  async findOne(id: string): Promise<Manager> {
    const manager = await this.managerModel.findById(id).exec();
    if (!manager) {
      throw new NotFoundException(`Manager with ID ${id} not found`);
    }
    return manager;
  }

  async findByCode(code: string): Promise<Manager> {
    const manager = await this.managerModel.findOne({ code, isActive: true }).exec();
    if (!manager) {
      throw new NotFoundException(`Manager with code ${code} not found`);
    }
    return manager;
  }

  async update(id: string, updateManagerDto: UpdateManagerDto): Promise<Manager> {
    const updatedManager = await this.managerModel
      .findByIdAndUpdate(id, updateManagerDto, { new: true })
      .exec();
    if (!updatedManager) {
      throw new NotFoundException(`Manager with ID ${id} not found`);
    }
    return updatedManager;
  }

  async remove(id: string): Promise<Manager> {
    const deletedManager = await this.managerModel
      .findByIdAndUpdate(id, { isActive: false }, { new: true })
      .exec();
    if (!deletedManager) {
      throw new NotFoundException(`Manager with ID ${id} not found`);
    }
    return deletedManager;
  }
}
