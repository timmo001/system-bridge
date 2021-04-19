import { Test, TestingModule } from '@nestjs/testing';
import { DisplayController } from './display.controller';
import { DisplayService } from './display.service';

describe('DisplayController', () => {
  let controller: DisplayController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DisplayController],
      providers: [DisplayService],
    }).compile();

    controller = module.get<DisplayController>(DisplayController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
