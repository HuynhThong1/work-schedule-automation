import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Employee, EmployeeDocument, EmployeeType } from '../schemas/employee.schema';
import { Manager, ManagerDocument, ManagerLevel } from '../schemas/manager.schema';

@Injectable()
export class ProductionSeedService {
  private readonly logger = new Logger(ProductionSeedService.name);

  constructor(
    @InjectModel(Employee.name) private employeeModel: Model<EmployeeDocument>,
    @InjectModel(Manager.name) private managerModel: Model<ManagerDocument>,
  ) {}

  async seedProductionData() {
    try {
      // Check if data already exists
      const employeeCount = await this.employeeModel.countDocuments();
      const managerCount = await this.managerModel.countDocuments();

      if (employeeCount === 0) {
        await this.seedEmployees();
        this.logger.log('✅ Production employees seeded successfully');
      } else {
        this.logger.log('🔄 Employees already exist, skipping seed');
      }

      if (managerCount === 0) {
        await this.seedManagers();
        this.logger.log('✅ Production managers seeded successfully');
      } else {
        this.logger.log('🔄 Managers already exist, skipping seed');
      }

      return { success: true, message: 'Production data seeded successfully' };
    } catch (error) {
      this.logger.error('❌ Failed to seed production data', error);
      throw error;
    }
  }

  private async seedEmployees() {
    const employees = [
      {
        code: 'EMP001',
        name: 'Nguyen Van An',
        type: EmployeeType.NEW,
        fullTime: false,
        salaryByHour: 50000,
        email: 'an.nguyen@cinema.com',
        phone: '0901234567',
        maxHoursPerWeek: 20,
        availability: [
          { day: 'monday', startTime: '09:00', endTime: '17:00' },
          { day: 'tuesday', startTime: '09:00', endTime: '17:00' },
          { day: 'wednesday', startTime: '09:00', endTime: '17:00' },
        ],
        isActive: true,
      },
      {
        code: 'EMP002',
        name: 'Tran Thi Binh',
        type: EmployeeType.JUNIOR,
        fullTime: true,
        salaryByHour: 75000,
        email: 'binh.tran@cinema.com',
        phone: '0901234568',
        maxHoursPerWeek: 40,
        availability: [
          { day: 'monday', startTime: '08:00', endTime: '18:00' },
          { day: 'tuesday', startTime: '08:00', endTime: '18:00' },
          { day: 'wednesday', startTime: '08:00', endTime: '18:00' },
          { day: 'thursday', startTime: '08:00', endTime: '18:00' },
          { day: 'friday', startTime: '08:00', endTime: '18:00' },
        ],
        isActive: true,
      },
    ];

    await this.employeeModel.insertMany(employees);
  }

  private async seedManagers() {
    const managers = [
      {
        code: 'MGR001',
        name: 'Hoang Van Manager',
        level: ManagerLevel.MIDDLE,
        email: 'manager.hoang@cinema.com',
        phone: '0901234571',
        isActive: true,
      },
      {
        code: 'ADMIN001',
        name: 'Nguyen Thi Senior',
        level: ManagerLevel.SENIOR,
        email: 'senior.nguyen@cinema.com',
        phone: '0901234572',
        isActive: true,
      },
    ];

    await this.managerModel.insertMany(managers);
  }
}
