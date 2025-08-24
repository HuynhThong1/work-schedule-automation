import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { RulesService } from './rules.service';
import { RulesController } from './rules.controller';
import { Rule, RuleSchema } from '../schemas/rule.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Rule.name, schema: RuleSchema }]),
  ],
  controllers: [RulesController],
  providers: [RulesService],
  exports: [RulesService],
})
export class RulesModule {}
