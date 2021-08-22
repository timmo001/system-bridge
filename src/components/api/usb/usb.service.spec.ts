import { Test, TestingModule } from "@nestjs/testing";
import { UsbService } from "./usb.service";

describe("UsbService", () => {
  let service: UsbService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [UsbService],
    }).compile();

    service = module.get<UsbService>(UsbService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });
});
