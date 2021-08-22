import { Test, TestingModule } from "@nestjs/testing";

import { SystemController } from "./system.controller";
import { SystemService } from "./system.service";

describe("SystemController", () => {
  let controller: SystemController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SystemController],
      providers: [SystemService],
    }).compile();

    controller = module.get<SystemController>(SystemController);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });
});
