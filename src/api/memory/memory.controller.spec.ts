import { Test, TestingModule } from "@nestjs/testing";

import { MemoryController } from "./memory.controller";
import { MemoryService } from "./memory.service";

describe("MemoryController", () => {
  let controller: MemoryController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MemoryController],
      providers: [MemoryService],
    }).compile();

    controller = module.get<MemoryController>(MemoryController);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });
});
