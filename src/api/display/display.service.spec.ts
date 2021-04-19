import { Test, TestingModule } from '@nestjs/testing';
import { DisplayService } from './display.service';

describe('DisplayService', () => {
  let service: DisplayService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DisplayService],
    }).compile();

    service = module.get<DisplayService>(DisplayService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
