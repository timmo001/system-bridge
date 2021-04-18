import { Test, TestingModule } from '@nestjs/testing';
import { BatteryController } from './battery.controller';
import { BatteryService } from './battery.service';

describe('BatteryController', () => {
  let controller: BatteryController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BatteryController],
      providers: [BatteryService],
    }).compile();

    controller = module.get<BatteryController>(BatteryController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
