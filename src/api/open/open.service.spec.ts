import { Test, TestingModule } from "@nestjs/testing";
import { OpenService } from "./open.service";

describe("OpenService", () => {
  let service: OpenService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [OpenService],
    }).compile();

    service = module.get<OpenService>(OpenService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });
});
