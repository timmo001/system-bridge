import { Test, TestingModule } from '@nestjs/testing';
import { CommandController } from './command.controller';
import { CommandService } from './command.service';

describe('CommandController', () => {
  let controller: CommandController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CommandController],
      providers: [CommandService],
    }).compile();

    controller = module.get<CommandController>(CommandController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
