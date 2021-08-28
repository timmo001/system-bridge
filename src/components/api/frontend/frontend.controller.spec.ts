import { Test, TestingModule } from "@nestjs/testing";

import { FrontendController } from "./frontend.controller";
import { FrontendService } from "./frontend.service";

describe("FrontendController", () => {
  let controller: FrontendController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [FrontendController],
      providers: [FrontendService],
    }).compile();

    controller = module.get<FrontendController>(FrontendController);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });
});
