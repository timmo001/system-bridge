import { Test, TestingModule } from '@nestjs/testing';
import { ProcessesService } from './processes.service';

describe('ProcessesService', () => {
  let service: ProcessesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ProcessesService],
    }).compile();

    service = module.get<ProcessesService>(ProcessesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
