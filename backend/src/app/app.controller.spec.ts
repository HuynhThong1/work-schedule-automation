import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { SeedService } from '../seeds/seed-data';

describe('AppController', () => {
  let app: TestingModule;

  beforeAll(async () => {
    const mockSeedService = {
      seedData: jest.fn().mockResolvedValue(undefined),
    };

    app = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        AppService,
        {
          provide: SeedService,
          useValue: mockSeedService,
        },
      ],
    }).compile();
  });

  describe('getData', () => {
    it('should return "Hello API"', () => {
      const appController = app.get<AppController>(AppController);
      expect(appController.getData()).toEqual({ message: 'Hello API' });
    });
  });
});
