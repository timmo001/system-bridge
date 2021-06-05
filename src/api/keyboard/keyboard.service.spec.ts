import { Test, TestingModule } from "@nestjs/testing";
import { KeyboardService } from "./keyboard.service";

describe("KeyboardService", () => {
  let service: KeyboardService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [KeyboardService],
    }).compile();

    service = module.get<KeyboardService>(KeyboardService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });
});
