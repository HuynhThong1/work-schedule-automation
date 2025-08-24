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
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ManagersService, CreateManagerDto, UpdateManagerDto } from './managers.service';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';

@Controller('managers')
@UseGuards(AuthGuard('jwt'))
export class ManagersController {
  constructor(private readonly managersService: ManagersService) {}

  @Post()
  @Roles('manager')
  @UseGuards(RolesGuard)
  create(@Body() createManagerDto: CreateManagerDto, @Request() req) {
    // Only senior managers can create new managers
    if (req.user.type !== 'senior') {
      return { message: 'Only senior managers can create new managers' };
    }
    return this.managersService.create(createManagerDto);
  }

  @Get()
  @Roles('manager')
  @UseGuards(RolesGuard)
  findAll() {
    return this.managersService.findAll();
  }

  @Get('me')
  getMyProfile(@Request() req) {
    if (req.user.role !== 'manager') {
      return { message: 'Only managers can access this endpoint' };
    }
    return this.managersService.findOne(req.user.sub);
  }

  @Get(':id')
  @Roles('manager')
  @UseGuards(RolesGuard)
  findOne(@Param('id') id: string) {
    return this.managersService.findOne(id);
  }

  @Patch(':id')
  @Roles('manager')
  @UseGuards(RolesGuard)
  update(@Param('id') id: string, @Body() updateManagerDto: UpdateManagerDto, @Request() req) {
    // Only senior managers can update manager details
    if (req.user.type !== 'senior') {
      return { message: 'Only senior managers can update manager details' };
    }
    return this.managersService.update(id, updateManagerDto);
  }

  @Delete(':id')
  @Roles('manager')
  @UseGuards(RolesGuard)
  remove(@Param('id') id: string, @Request() req) {
    // Only senior managers can delete managers
    if (req.user.type !== 'senior') {
      return { message: 'Only senior managers can delete managers' };
    }
    return this.managersService.remove(id);
  }
}
