import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { Employee, EmployeeDocument } from '../schemas/employee.schema';
import { Manager, ManagerDocument } from '../schemas/manager.schema';

export interface JwtPayload {
  sub: string;
  code: string;
  name: string;
  role: 'employee' | 'manager';
  type?: string; // employee type or manager level
}

export interface LoginResponse {
  access_token: string;
  user: {
    id: string;
    code: string;
    name: string;
    role: 'employee' | 'manager';
    type?: string;
  };
}

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(Employee.name) private employeeModel: Model<EmployeeDocument>,
    @InjectModel(Manager.name) private managerModel: Model<ManagerDocument>,
    private jwtService: JwtService,
  ) {}

  async validateUser(code: string): Promise<any> {
    // First try to find as employee
    const employee = await this.employeeModel.findOne({ code, isActive: true }).exec();
    if (employee) {
      return {
        id: employee._id,
        code: employee.code,
        name: employee.name,
        role: 'employee',
        type: employee.type,
      };
    }

    // Then try to find as manager
    const manager = await this.managerModel.findOne({ code, isActive: true }).exec();
    if (manager) {
      return {
        id: manager._id,
        code: manager.code,
        name: manager.name,
        role: 'manager',
        type: manager.level,
      };
    }

    return null;
  }

  async login(code: string): Promise<LoginResponse> {
    const user = await this.validateUser(code);
    if (!user) {
      throw new UnauthorizedException('Invalid employee code');
    }

    const payload: JwtPayload = {
      sub: user.id,
      code: user.code,
      name: user.name,
      role: user.role,
      type: user.type,
    };

    return {
      access_token: this.jwtService.sign(payload),
      user,
    };
  }

  async validateJwtPayload(payload: JwtPayload): Promise<any> {
    if (payload.role === 'employee') {
      const employee = await this.employeeModel.findById(payload.sub).exec();
      return employee ? { ...payload, entity: employee } : null;
    } else {
      const manager = await this.managerModel.findById(payload.sub).exec();
      return manager ? { ...payload, entity: manager } : null;
    }
  }
}
