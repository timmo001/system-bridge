import { Test, TestingModule } from "@nestjs/testing";

import { FilesystemController } from "./filesystem.controller";
import { FilesystemService } from "./filesystem.service";

describe("FilesystemController", () => {
  let controller: FilesystemController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [FilesystemController],
      providers: [FilesystemService],
    }).compile();

    controller = module.get<FilesystemController>(FilesystemController);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });
});
