import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RulesService, CreateRuleDto, UpdateRuleDto } from './rules.service';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { RuleType } from '../schemas/rule.schema';

@Controller('rules')
@UseGuards(AuthGuard('jwt'))
export class RulesController {
  constructor(private readonly rulesService: RulesService) {}

  @Post()
  @Roles('manager')
  @UseGuards(RolesGuard)
  create(@Body() createRuleDto: CreateRuleDto) {
    return this.rulesService.create(createRuleDto);
  }

  @Get()
  @Roles('manager')
  @UseGuards(RolesGuard)
  findAll(@Query('active') active?: string, @Query('type') type?: RuleType) {
    if (active === 'true') {
      return this.rulesService.findActive();
    }
    if (type) {
      return this.rulesService.findByType(type);
    }
    return this.rulesService.findAll();
  }

  @Get('assignment')
  @Roles('manager')
  @UseGuards(RolesGuard)
  getAssignmentRules() {
    return this.rulesService.getAssignmentRules();
  }

  @Get('constraint')
  @Roles('manager')
  @UseGuards(RolesGuard)
  getConstraintRules() {
    return this.rulesService.getConstraintRules();
  }

  @Get('priority')
  @Roles('manager')
  @UseGuards(RolesGuard)
  getPriorityRules() {
    return this.rulesService.getPriorityRules();
  }

  @Get(':id')
  @Roles('manager')
  @UseGuards(RolesGuard)
  findOne(@Param('id') id: string) {
    return this.rulesService.findOne(id);
  }

  @Patch(':id')
  @Roles('manager')
  @UseGuards(RolesGuard)
  update(@Param('id') id: string, @Body() updateRuleDto: UpdateRuleDto) {
    return this.rulesService.update(id, updateRuleDto);
  }

  @Delete(':id')
  @Roles('manager')
  @UseGuards(RolesGuard)
  remove(@Param('id') id: string) {
    return this.rulesService.remove(id);
  }

  @Patch(':id/activate')
  @Roles('manager')
  @UseGuards(RolesGuard)
  activate(@Param('id') id: string) {
    return this.rulesService.activate(id);
  }

  @Patch(':id/deactivate')
  @Roles('manager')
  @UseGuards(RolesGuard)
  deactivate(@Param('id') id: string) {
    return this.rulesService.deactivate(id);
  }
}
