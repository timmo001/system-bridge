import { Test, TestingModule } from '@nestjs/testing';
import { BatteryService } from './battery.service';

describe('BatteryService', () => {
  let service: BatteryService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [BatteryService],
    }).compile();

    service = module.get<BatteryService>(BatteryService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
