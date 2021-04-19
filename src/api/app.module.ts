import { Module } from "@nestjs/common";
import { WinstonModule } from "nest-winston";

import { AudioModule } from "./audio/audio.module";
import { BatteryModule } from "./battery/battery.module";
import { BluetoothModule } from "./bluetooth/bluetooth.module";
import { MediaModule } from "./media/media.module";
import logger from "../logger";

@Module({
  imports: [
    WinstonModule.forRoot(logger),
    AudioModule,
    BatteryModule,
    BluetoothModule,
    MediaModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
