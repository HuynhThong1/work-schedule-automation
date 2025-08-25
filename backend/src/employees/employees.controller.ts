import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
  Query,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { EmployeesService, CreateEmployeeDto, UpdateEmployeeDto, UpdateAvailabilityDto } from './employees.service';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';

@Controller('employees')
@UseGuards(AuthGuard('jwt'))
export class EmployeesController {
  constructor(private readonly employeesService: EmployeesService) {}

  @Post()
  @Roles('manager')
  @UseGuards(RolesGuard)
  create(@Body() createEmployeeDto: CreateEmployeeDto) {
    return this.employeesService.create(createEmployeeDto);
  }

  @Get()
  @Roles('manager')
  @UseGuards(RolesGuard)
  findAll() {
    return this.employeesService.findAll();
  }

  @Get('basic-info')
  findBasicInfo() {
    // Allow all authenticated users to get basic employee info (names and IDs only)
    return this.employeesService.findBasicInfo();
  }

  @Get('available')
  @Roles('manager')
  @UseGuards(RolesGuard)
  findAvailable(
    @Query('date') date: string,
    @Query('startTime') startTime: string,
    @Query('endTime') endTime: string,
  ) {
    return this.employeesService.findAvailableEmployees(new Date(date), startTime, endTime);
  }

  @Get('me')
  getMyProfile(@Request() req) {
    if (req.user.role !== 'employee') {
      return { message: 'Only employees can access this endpoint' };
    }
    return this.employeesService.findOne(req.user.sub);
  }

  @Get(':id')
  @Roles('manager')
  @UseGuards(RolesGuard)
  findOne(@Param('id') id: string) {
    return this.employeesService.findOne(id);
  }

  @Patch('me/availability')
  updateMyAvailability(@Request() req, @Body() updateAvailabilityDto: UpdateAvailabilityDto) {
    if (req.user.role !== 'employee') {
      return { message: 'Only employees can update their availability' };
    }
    return this.employeesService.updateAvailability(req.user.sub, updateAvailabilityDto);
  }

  @Patch(':id')
  @Roles('manager')
  @UseGuards(RolesGuard)
  update(@Param('id') id: string, @Body() updateEmployeeDto: UpdateEmployeeDto) {
    return this.employeesService.update(id, updateEmployeeDto);
  }

  @Delete(':id')
  @Roles('manager')
  @UseGuards(RolesGuard)
  remove(@Param('id') id: string) {
    return this.employeesService.remove(id);
  }
}
