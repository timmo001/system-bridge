import { Module } from "@nestjs/common";
import { BluetoothService } from "./bluetooth.service";
import { BluetoothController } from "./bluetooth.controller";

@Module({
  controllers: [BluetoothController],
  providers: [BluetoothService],
})
export class BluetoothModule {}
