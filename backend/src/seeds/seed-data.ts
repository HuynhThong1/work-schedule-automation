import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Employee, EmployeeDocument, EmployeeType } from '../schemas/employee.schema';
import { Manager, ManagerDocument, ManagerLevel } from '../schemas/manager.schema';
import { Rule, RuleDocument, RuleType } from '../schemas/rule.schema';
import { Shift, ShiftDocument, ShiftStatus } from '../schemas/shift.schema';
import moment from 'moment';

@Injectable()
export class SeedService implements OnModuleInit {
  constructor(
    @InjectModel(Employee.name) private employeeModel: Model<EmployeeDocument>,
    @InjectModel(Manager.name) private managerModel: Model<ManagerDocument>,
    @InjectModel(Rule.name) private ruleModel: Model<RuleDocument>,
    @InjectModel(Shift.name) private shiftModel: Model<ShiftDocument>,
  ) {}

  async onModuleInit() {
    // Seed data in both development and production environments
    // In production, you can control this with an environment variable
    const shouldSeed = process.env.NODE_ENV === 'development' || process.env.ENABLE_SEED === 'true';

    if (shouldSeed) {
      await this.seedData();
    }
  }

  async seedData() {
    // Check if data already exists
    const employeeCount = await this.employeeModel.countDocuments();
    const managerCount = await this.managerModel.countDocuments();

    if (employeeCount === 0) {
      await this.seedEmployees();
    }

    if (managerCount === 0) {
      await this.seedManagers();
    }

    const ruleCount = await this.ruleModel.countDocuments();
    if (ruleCount === 0) {
      await this.seedRules();
    }

    const shiftCount = await this.shiftModel.countDocuments();
    if (shiftCount === 0) {
      await this.seedShifts();
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
      },
      {
        code: 'EMP003',
        name: 'Le Van Cuong',
        type: EmployeeType.NEW,
        fullTime: false,
        salaryByHour: 50000,
        email: 'cuong.le@cinema.com',
        phone: '0901234569',
        maxHoursPerWeek: 25,
        availability: [
          { day: 'thursday', startTime: '14:00', endTime: '22:00' },
          { day: 'friday', startTime: '14:00', endTime: '22:00' },
          { day: 'saturday', startTime: '10:00', endTime: '22:00' },
          { day: 'sunday', startTime: '10:00', endTime: '22:00' },
        ],
      },
      {
        code: 'EMP004',
        name: 'Pham Thi Dung',
        type: EmployeeType.JUNIOR,
        fullTime: true,
        salaryByHour: 80000,
        email: 'dung.pham@cinema.com',
        phone: '0901234570',
        maxHoursPerWeek: 40,
        availability: [
          { day: 'monday', startTime: '13:00', endTime: '23:00' },
          { day: 'tuesday', startTime: '13:00', endTime: '23:00' },
          { day: 'wednesday', startTime: '13:00', endTime: '23:00' },
          { day: 'thursday', startTime: '13:00', endTime: '23:00' },
          { day: 'friday', startTime: '13:00', endTime: '23:00' },
        ],
      },
    ];

    await this.employeeModel.insertMany(employees);
    console.log('✅ Employees seeded successfully');
  }

  private async seedManagers() {
    const managers = [
      {
        code: 'MGR001',
        name: 'Hoang Van Manager',
        level: ManagerLevel.MIDDLE,
        email: 'manager.hoang@cinema.com',
        phone: '0901234571',
      },
      {
        code: 'ADMIN001',
        name: 'Nguyen Thi Senior',
        level: ManagerLevel.SENIOR,
        email: 'senior.nguyen@cinema.com',
        phone: '0901234572',
      },
    ];

    await this.managerModel.insertMany(managers);
    console.log('✅ Managers seeded successfully');
  }

  private async seedRules() {
    const rules = [
      {
        name: 'Random Assignment',
        description: 'Randomly assign available employees to shifts',
        type: RuleType.ASSIGNMENT,
        parameters: {
          method: 'random',
          respectAvailability: true,
        },
        isActive: true,
        priority: 1,
      },
      {
        name: 'Minimum Staff Per Shift',
        description: 'Ensure minimum number of staff per shift',
        type: RuleType.CONSTRAINT,
        parameters: {
          minimumStaff: 2,
          applyToAllShifts: true,
        },
        isActive: true,
        priority: 10,
      },
      {
        name: 'Maximum Hours Per Week',
        description: 'Limit maximum working hours per employee per week',
        type: RuleType.CONSTRAINT,
        parameters: {
          maxHoursFullTime: 40,
          maxHoursPartTime: 25,
        },
        isActive: true,
        priority: 9,
      },
      {
        name: 'Junior Priority',
        description: 'Give priority to junior employees for shift assignment',
        type: RuleType.PRIORITY,
        parameters: {
          priorityOrder: ['junior', 'new'],
          weight: 0.7,
        },
        isActive: false,
        priority: 5,
      },
    ];

    await this.ruleModel.insertMany(rules);
    console.log('✅ Rules seeded successfully');
  }

  private async seedShifts() {
    // Get the first manager to assign shifts to
    const manager = await this.managerModel.findOne();
    if (!manager) {
      console.log('❌ No manager found, skipping shift seeding');
      return;
    }

    const shifts = [];
    const startDate = moment().startOf('week'); // Start of current week
    const endDate = moment().add(2, 'weeks').endOf('week'); // Next 2 weeks

    // Standard shift templates
    const shiftTemplates = [
      { name: 'Morning Shift', startTime: '09:00', endTime: '14:00', capacity: 3 },
      { name: 'Afternoon Shift', startTime: '14:00', endTime: '18:00', capacity: 3 },
      { name: 'Evening Shift', startTime: '18:00', endTime: '00:00', capacity: 3 },
    ];

    const currentDate = moment(startDate);
    while (currentDate.isSameOrBefore(endDate, 'day')) {
      for (const template of shiftTemplates) {
        shifts.push({
          date: currentDate.toDate(),
          startTime: template.startTime,
          endTime: template.endTime,
          name: template.name,
          capacity: template.capacity,
          manager: manager._id,
          status: ShiftStatus.PUBLISHED, // Make them published so employees can see them
          assignedEmployees: [],
          description: `${template.name} for ${currentDate.format('dddd, MMMM DD, YYYY')}`,
        });
      }
      currentDate.add(1, 'day');
    }

    await this.shiftModel.insertMany(shifts);
    console.log(`✅ ${shifts.length} shifts seeded successfully for ${Math.ceil(shifts.length / 3)} days`);
  }
}
