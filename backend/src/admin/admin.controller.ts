import { Controller, Post, HttpCode, HttpStatus } from '@nestjs/common';
import { ProductionSeedService } from '../seeds/production-seed';

@Controller('admin')
export class AdminController {
  constructor(private readonly productionSeedService: ProductionSeedService) {}

  @Post('seed')
  @HttpCode(HttpStatus.OK)
  async seedData() {
    return await this.productionSeedService.seedProductionData();
  }
}
