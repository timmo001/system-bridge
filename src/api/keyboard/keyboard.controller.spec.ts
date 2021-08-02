import { Test, TestingModule } from "@nestjs/testing";
import { KeyboardController } from "./keyboard.controller";
import { KeyboardService } from "./keyboard.service";

describe("KeyboardController", () => {
  let controller: KeyboardController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [KeyboardController],
      providers: [KeyboardService],
    }).compile();

    controller = module.get<KeyboardController>(KeyboardController);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });
});
