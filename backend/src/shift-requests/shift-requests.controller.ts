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
import { ShiftRequestsService, CreateShiftRequestDto, UpdateShiftRequestDto } from './shift-requests.service';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';

@Controller('shift-requests')
@UseGuards(AuthGuard('jwt'))
export class ShiftRequestsController {
  constructor(private readonly shiftRequestsService: ShiftRequestsService) {}

  @Post()
  create(@Body() createShiftRequestDto: CreateShiftRequestDto, @Request() req) {
    // Set the employee to the current user if not provided
    if (!createShiftRequestDto.employeeId) {
      createShiftRequestDto.employeeId = req.user.sub;
    }
    return this.shiftRequestsService.create(createShiftRequestDto);
  }

  @Get()
  findAll(@Request() req, @Query('employeeId') employeeId?: string) {
    // If user is an employee, only show their requests
    if (req.user.role === 'employee') {
      return this.shiftRequestsService.findByEmployee(req.user.sub);
    }

    // Managers can see all requests or filter by employee
    if (employeeId) {
      return this.shiftRequestsService.findByEmployee(employeeId);
    }

    return this.shiftRequestsService.findAll();
  }

  @Get('my-requests')
  getMyRequests(@Request() req) {
    if (req.user.role !== 'employee') {
      return { message: 'Only employees can access this endpoint' };
    }
    return this.shiftRequestsService.findByEmployee(req.user.sub);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.shiftRequestsService.findOne(id);
  }

  @Patch(':id')
  @Roles('manager')
  @UseGuards(RolesGuard)
  update(@Param('id') id: string, @Body() updateShiftRequestDto: UpdateShiftRequestDto, @Request() req) {
    // Set the reviewer to the current manager
    updateShiftRequestDto.reviewedBy = req.user.sub;
    updateShiftRequestDto.reviewedAt = new Date();
    return this.shiftRequestsService.update(id, updateShiftRequestDto);
  }

  @Patch(':id/approve')
  @Roles('manager')
  @UseGuards(RolesGuard)
  approve(@Param('id') id: string, @Request() req, @Body('reviewNotes') reviewNotes?: string) {
    return this.shiftRequestsService.approve(id, req.user.sub, reviewNotes);
  }

  @Patch(':id/reject')
  @Roles('manager')
  @UseGuards(RolesGuard)
  reject(@Param('id') id: string, @Request() req, @Body('reviewNotes') reviewNotes?: string) {
    return this.shiftRequestsService.reject(id, req.user.sub, reviewNotes);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Request() req) {
    // Employees can only delete their own pending requests
    if (req.user.role === 'employee') {
      return this.shiftRequestsService.removeByEmployee(id, req.user.sub);
    }

    // Managers can delete any request
    return this.shiftRequestsService.remove(id);
  }
}
