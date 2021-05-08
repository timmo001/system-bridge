import { Test, TestingModule } from "@nestjs/testing";
import { MediaController } from "./media.controller";
import { MediaService } from "./media.service";

describe("MediaController", () => {
  let controller: MediaController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MediaController],
      providers: [MediaService],
    }).compile();

    controller = module.get<MediaController>(MediaController);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });
});
