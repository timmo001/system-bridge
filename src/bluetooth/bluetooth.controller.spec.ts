import { Test, TestingModule } from "@nestjs/testing";
import { BluetoothController } from "./bluetooth.controller";
import { BluetoothService } from "./bluetooth.service";

describe("BluetoothController", () => {
  let controller: BluetoothController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BluetoothController],
      providers: [BluetoothService],
    }).compile();

    controller = module.get<BluetoothController>(BluetoothController);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });
});
