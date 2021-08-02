import { Test, TestingModule } from "@nestjs/testing";

import { UsbController } from "./usb.controller";
import { UsbService } from "./usb.service";

describe("UsbController", () => {
  let controller: UsbController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsbController],
      providers: [UsbService],
    }).compile();

    controller = module.get<UsbController>(UsbController);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });
});
