import { Test, TestingModule } from '@nestjs/testing';

import { ProcessesController } from './processes.controller';
import { ProcessesService } from './processes.service';

describe('ProcessesController', () => {
  let controller: ProcessesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProcessesController],
      providers: [ProcessesService],
    }).compile();

    controller = module.get<ProcessesController>(ProcessesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
