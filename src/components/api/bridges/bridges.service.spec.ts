import { Test, TestingModule } from "@nestjs/testing";
import { BridgesService } from "./bridges.service";

describe("BridgesService", () => {
  let service: BridgesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [BridgesService],
    }).compile();

    service = module.get<BridgesService>(BridgesService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });
});
