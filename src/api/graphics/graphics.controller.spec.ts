import { Test, TestingModule } from "@nestjs/testing";

import { GraphicsController } from "./graphics.controller";
import { GraphicsService } from "./graphics.service";

describe("GraphicsController", () => {
  let controller: GraphicsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [GraphicsController],
      providers: [GraphicsService],
    }).compile();

    controller = module.get<GraphicsController>(GraphicsController);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });
});
