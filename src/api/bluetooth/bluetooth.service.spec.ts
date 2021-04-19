import { Test, TestingModule } from '@nestjs/testing';
import { BluetoothService } from './bluetooth.service';

describe('BluetoothService', () => {
  let service: BluetoothService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [BluetoothService],
    }).compile();

    service = module.get<BluetoothService>(BluetoothService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
