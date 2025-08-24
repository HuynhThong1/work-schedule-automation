import { Controller, Get, Post } from '@nestjs/common';
import { AppService } from './app.service';
import { SeedService } from '../seeds/seed-data';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly seedService: SeedService,
  ) {}

  @Get()
  getData() {
    return this.appService.getData();
  }

  @Post('seed')
  async seedData() {
    await this.seedService.seedData();
    return { message: 'Database seeded successfully' };
  }
}
