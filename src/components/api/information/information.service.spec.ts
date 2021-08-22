import { Test, TestingModule } from "@nestjs/testing";
import { InformationService } from "./information.service";

describe("InformationService", () => {
  let service: InformationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [InformationService],
    }).compile();

    service = module.get<InformationService>(InformationService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });
});
