import { Test, TestingModule } from "@nestjs/testing";
import { CommandService } from "./command.service";

describe("CommandService", () => {
  let service: CommandService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CommandService],
    }).compile();

    service = module.get<CommandService>(CommandService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });
});
