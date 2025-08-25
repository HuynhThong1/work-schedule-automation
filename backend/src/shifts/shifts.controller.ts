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
import { ShiftsService, CreateShiftDto, UpdateShiftDto, AssignEmployeeDto } from './shifts.service';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';

@Controller('shifts')
@UseGuards(AuthGuard('jwt'))
export class ShiftsController {
  constructor(private readonly shiftsService: ShiftsService) {}

  @Post()
  @Roles('manager')
  @UseGuards(RolesGuard)
  create(@Body() createShiftDto: CreateShiftDto, @Request() req) {
    // Set the manager to the current user if not provided
    if (!createShiftDto.manager) {
      createShiftDto.manager = req.user.sub;
    }
    return this.shiftsService.create(createShiftDto);
  }

  @Get()
  findAll(@Request() req, @Query('managerId') managerId?: string) {
    // If user is a manager, filter by their ID unless they're senior
    // Employees should see all shifts, so don't filter for them
    if (req.user.role === 'manager' && req.user.type !== 'senior' && !managerId) {
      managerId = req.user.sub;
    }
    // For employees (req.user.role === 'employee'), managerId remains undefined, showing all shifts
    return this.shiftsService.findAll(managerId);
  }

  @Get('date-range')
  findByDateRange(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('managerId') managerId?: string,
    @Request() req?,
  ) {
    // If user is a manager, filter by their ID unless they're senior
    if (req.user.role === 'manager' && req.user.type !== 'senior' && !managerId) {
      managerId = req.user.sub;
    }

    return this.shiftsService.findByDateRange(
      new Date(startDate),
      new Date(endDate),
      managerId,
    );
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.shiftsService.findOne(id);
  }

  @Patch(':id')
  @Roles('manager')
  @UseGuards(RolesGuard)
  update(@Param('id') id: string, @Body() updateShiftDto: UpdateShiftDto) {
    return this.shiftsService.update(id, updateShiftDto);
  }

  @Delete(':id')
  @Roles('manager')
  @UseGuards(RolesGuard)
  remove(@Param('id') id: string) {
    return this.shiftsService.remove(id);
  }

  @Post(':id/assign')
  @Roles('manager')
  @UseGuards(RolesGuard)
  assignEmployee(@Param('id') id: string, @Body() assignEmployeeDto: AssignEmployeeDto) {
    return this.shiftsService.assignEmployee(id, assignEmployeeDto);
  }

  @Delete(':id/unassign/:employeeId')
  @Roles('manager')
  @UseGuards(RolesGuard)
  unassignEmployee(@Param('id') id: string, @Param('employeeId') employeeId: string) {
    return this.shiftsService.unassignEmployee(id, employeeId);
  }

  @Patch(':id/publish')
  @Roles('manager')
  @UseGuards(RolesGuard)
  publishShift(@Param('id') id: string) {
    return this.shiftsService.publishShift(id);
  }

  @Get(':id/hours')
  getShiftHours(@Param('id') id: string) {
    return this.shiftsService.getShiftHours(id);
  }
}
