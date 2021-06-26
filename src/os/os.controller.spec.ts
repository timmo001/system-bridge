import { Test, TestingModule } from "@nestjs/testing";

import { OsController } from "./os.controller";
import { OsService } from "./os.service";

describe("OsController", () => {
  let controller: OsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OsController],
      providers: [OsService],
    }).compile();

    controller = module.get<OsController>(OsController);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });
});
