import { Test, TestingModule } from "@nestjs/testing";
import { OpenController } from "./open.controller";
import { OpenService } from "./open.service";

describe("OpenController", () => {
  let controller: OpenController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OpenController],
      providers: [OpenService],
    }).compile();

    controller = module.get<OpenController>(OpenController);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });
});
