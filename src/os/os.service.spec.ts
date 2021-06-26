import { Test, TestingModule } from "@nestjs/testing";
import { OsService } from "./os.service";

describe("OsService", () => {
  let service: OsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [OsService],
    }).compile();

    service = module.get<OsService>(OsService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });
});
