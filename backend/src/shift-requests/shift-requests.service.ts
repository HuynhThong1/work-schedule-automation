import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { IsString, IsOptional, IsEnum, IsDateString } from 'class-validator';
import { ShiftRequest, ShiftRequestDocument, RequestType, RequestStatus } from '../schemas/shift-request.schema';
import { Employee, EmployeeDocument } from '../schemas/employee.schema';
import { Shift, ShiftDocument } from '../schemas/shift.schema';

export class CreateShiftRequestDto {
  @IsOptional()
  @IsString()
  employeeId?: string;

  @IsOptional()
  @IsString()
  shiftId?: string;

  @IsEnum(RequestType)
  type: RequestType;

  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @IsString()
  targetShiftId?: string;

  @IsOptional()
  @IsString()
  swapWithEmployeeId?: string;

  // For direct shift requests (when no existing shift)
  @IsOptional()
  date?: Date;

  @IsOptional()
  @IsString()
  startTime?: string;

  @IsOptional()
  @IsString()
  endTime?: string;
}

export class UpdateShiftRequestDto {
  @IsOptional()
  @IsEnum(RequestStatus)
  status?: RequestStatus;

  @IsOptional()
  @IsString()
  reviewedBy?: string;

  @IsOptional()
  @IsDateString()
  reviewedAt?: Date;

  @IsOptional()
  @IsString()
  reviewNotes?: string;
}

@Injectable()
export class ShiftRequestsService {
  constructor(
    @InjectModel(ShiftRequest.name) private shiftRequestModel: Model<ShiftRequestDocument>,
    @InjectModel(Employee.name) private employeeModel: Model<EmployeeDocument>,
    @InjectModel(Shift.name) private shiftModel: Model<ShiftDocument>,
  ) {}

  async create(createShiftRequestDto: CreateShiftRequestDto): Promise<ShiftRequest> {
    // Validate employee exists
    const employee = await this.employeeModel.findById(createShiftRequestDto.employeeId).exec();
    if (!employee) {
      throw new NotFoundException(`Employee with ID ${createShiftRequestDto.employeeId} not found`);
    }

    // If shiftId is provided, validate the shift exists
    if (createShiftRequestDto.shiftId) {
      const shift = await this.shiftModel.findById(createShiftRequestDto.shiftId).exec();
      if (!shift) {
        throw new NotFoundException(`Shift with ID ${createShiftRequestDto.shiftId} not found`);
      }

      // Check if employee is already assigned to this shift
      if (shift.assignedEmployees.some(id => id.toString() === createShiftRequestDto.employeeId)) {
        throw new BadRequestException('Employee is already assigned to this shift');
      }

      // Check if there's already a pending request for this shift
      const existingRequest = await this.shiftRequestModel.findOne({
        employeeId: createShiftRequestDto.employeeId,
        shiftId: createShiftRequestDto.shiftId,
        status: RequestStatus.PENDING,
      }).exec();

      if (existingRequest) {
        throw new BadRequestException('There is already a pending request for this shift');
      }
    } else if (createShiftRequestDto.type === RequestType.PICKUP && createShiftRequestDto.date && createShiftRequestDto.startTime && createShiftRequestDto.endTime) {
      // For direct shift requests, validate required fields
      if (!createShiftRequestDto.date || !createShiftRequestDto.startTime || !createShiftRequestDto.endTime) {
        throw new BadRequestException('Date, start time, and end time are required for direct shift requests');
      }

      // Check if there's already a pending request for the same date and time
      const existingRequest = await this.shiftRequestModel.findOne({
        employeeId: createShiftRequestDto.employeeId,
        date: createShiftRequestDto.date,
        startTime: createShiftRequestDto.startTime,
        endTime: createShiftRequestDto.endTime,
        status: RequestStatus.PENDING,
      }).exec();

      if (existingRequest) {
        throw new BadRequestException('There is already a pending request for this date and time');
      }
    } else {
      throw new BadRequestException('Either shiftId or date/time information must be provided');
    }

    const createdRequest = new this.shiftRequestModel(createShiftRequestDto);
    return createdRequest.save();
  }

  async findAll(): Promise<ShiftRequest[]> {
    return this.shiftRequestModel
      .find()
      .populate('employeeId', 'name code email')
      .populate('shiftId')
      .populate('reviewedBy', 'name code')
      .populate('targetShiftId')
      .populate('swapWithEmployeeId', 'name code')
      .sort({ createdAt: -1 })
      .exec();
  }

  async findByEmployee(employeeId: string): Promise<ShiftRequest[]> {
    return this.shiftRequestModel
      .find({ employeeId })
      .populate('shiftId')
      .populate('reviewedBy', 'name code')
      .populate('targetShiftId')
      .populate('swapWithEmployeeId', 'name code')
      .sort({ createdAt: -1 })
      .exec();
  }

  async findOne(id: string): Promise<ShiftRequest> {
    const request = await this.shiftRequestModel
      .findById(id)
      .populate('employeeId', 'name code email')
      .populate('shiftId')
      .populate('reviewedBy', 'name code')
      .populate('targetShiftId')
      .populate('swapWithEmployeeId', 'name code')
      .exec();

    if (!request) {
      throw new NotFoundException(`Shift request with ID ${id} not found`);
    }

    return request;
  }

  async update(id: string, updateShiftRequestDto: UpdateShiftRequestDto): Promise<ShiftRequest> {
    const updatedRequest = await this.shiftRequestModel
      .findByIdAndUpdate(id, updateShiftRequestDto, { new: true })
      .populate('employeeId', 'name code email')
      .populate('shiftId')
      .populate('reviewedBy', 'name code')
      .exec();

    if (!updatedRequest) {
      throw new NotFoundException(`Shift request with ID ${id} not found`);
    }

    return updatedRequest;
  }

  async approve(id: string, reviewerId: string, reviewNotes?: string): Promise<ShiftRequest> {
    const request = await this.shiftRequestModel.findById(id).exec();
    if (!request) {
      throw new NotFoundException(`Shift request with ID ${id} not found`);
    }

    if (request.status !== RequestStatus.PENDING) {
      throw new BadRequestException('Only pending requests can be approved');
    }

    // If it's a pickup request with an existing shift, assign the employee to the shift
    if (request.type === RequestType.PICKUP && request.shiftId) {
      const shift = await this.shiftModel.findById(request.shiftId).exec();
      if (shift && shift.assignedEmployees.length < shift.capacity) {
        shift.assignedEmployees.push(request.employeeId);
        await shift.save();
      }
    }
    // If it's a direct shift request, create a new shift and assign the employee
    else if (request.type === RequestType.PICKUP && request.date && request.startTime && request.endTime) {
      const newShift = new this.shiftModel({
        date: request.date,
        startTime: request.startTime,
        endTime: request.endTime,
        name: `Requested Shift - ${request.startTime} to ${request.endTime}`,
        capacity: 1,
        assignedEmployees: [request.employeeId],
        manager: reviewerId,
        status: 'published',
      });
      await newShift.save();
    }

    return this.update(id, {
      status: RequestStatus.APPROVED,
      reviewedBy: reviewerId,
      reviewedAt: new Date(),
      reviewNotes,
    });
  }

  async reject(id: string, reviewerId: string, reviewNotes?: string): Promise<ShiftRequest> {
    const request = await this.shiftRequestModel.findById(id).exec();
    if (!request) {
      throw new NotFoundException(`Shift request with ID ${id} not found`);
    }

    if (request.status !== RequestStatus.PENDING) {
      throw new BadRequestException('Only pending requests can be rejected');
    }

    return this.update(id, {
      status: RequestStatus.REJECTED,
      reviewedBy: reviewerId,
      reviewedAt: new Date(),
      reviewNotes,
    });
  }

  async remove(id: string): Promise<ShiftRequest> {
    const deletedRequest = await this.shiftRequestModel.findByIdAndDelete(id).exec();
    if (!deletedRequest) {
      throw new NotFoundException(`Shift request with ID ${id} not found`);
    }
    return deletedRequest;
  }

  async removeByEmployee(id: string, employeeId: string): Promise<ShiftRequest> {
    const request = await this.shiftRequestModel.findById(id).exec();
    if (!request) {
      throw new NotFoundException(`Shift request with ID ${id} not found`);
    }

    if (request.employeeId.toString() !== employeeId) {
      throw new BadRequestException('You can only delete your own requests');
    }

    if (request.status !== RequestStatus.PENDING) {
      throw new BadRequestException('Only pending requests can be deleted');
    }

    return this.remove(id);
  }
}
