import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { SchedulingService, CreateScheduleDto, GenerateScheduleDto } from './scheduling.service';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';

@Controller('schedules')
@UseGuards(AuthGuard('jwt'))
export class SchedulingController {
  constructor(private readonly schedulingService: SchedulingService) {}

  @Post()
  @Roles('manager')
  @UseGuards(RolesGuard)
  create(@Body() createScheduleDto: CreateScheduleDto, @Request() req) {
    if (!createScheduleDto.createdBy) {
      createScheduleDto.createdBy = req.user.sub;
    }
    return this.schedulingService.create(createScheduleDto);
  }

  @Post('generate')
  @Roles('manager')
  @UseGuards(RolesGuard)
  generate(@Body() generateScheduleDto: GenerateScheduleDto, @Request() req) {
    if (!generateScheduleDto.createdBy) {
      generateScheduleDto.createdBy = req.user.sub;
    }
    return this.schedulingService.generateSchedule(generateScheduleDto);
  }

  @Get()
  findAll() {
    return this.schedulingService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.schedulingService.findOne(id);
  }

  @Patch(':id/auto-assign')
  @Roles('manager')
  @UseGuards(RolesGuard)
  autoAssign(@Param('id') id: string, @Body('respectRequests') respectRequests: boolean = true) {
    return this.schedulingService.autoAssignEmployees(id, respectRequests);
  }

  @Patch(':id/publish')
  @Roles('manager')
  @UseGuards(RolesGuard)
  publish(@Param('id') id: string) {
    return this.schedulingService.publishSchedule(id);
  }
}
