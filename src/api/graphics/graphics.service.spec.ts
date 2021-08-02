import { Test, TestingModule } from "@nestjs/testing";
import { GraphicsService } from "./graphics.service";

describe("GraphicsService", () => {
  let service: GraphicsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [GraphicsService],
    }).compile();

    service = module.get<GraphicsService>(GraphicsService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });
});
