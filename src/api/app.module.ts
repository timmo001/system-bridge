import { Module } from "@nestjs/common";
import { WinstonModule } from "nest-winston";

import { AudioModule } from "./audio/audio.module";
import { BatteryModule } from "./battery/battery.module";
import { BluetoothModule } from "./bluetooth/bluetooth.module";
import { CommandModule } from "./command/command.module";
import { CpuModule } from "./cpu/cpu.module";
import { DisplayModule } from "./display/display.module";
import { EventsModule } from './events/events.module';
import { FilesystemModule } from "./filesystem/filesystem.module";
import { GraphicsModule } from "./graphics/graphics.module";
import { MediaModule } from "./media/media.module";
import { MemoryModule } from "./memory/memory.module";
import { NetworkModule } from "./network/network.module";
import { NotificationModule } from "./notification/notification.module";
import { OpenModule } from "./open/open.module";
import { OsModule } from "./os/os.module";
import { ProcessesModule } from "./processes/processes.module";
import { SystemModule } from "./system/system.module";
import logger from "../logger";

@Module({
  imports: [
    WinstonModule.forRoot(logger),
    AudioModule,
    BatteryModule,
    BluetoothModule,
    CommandModule,
    CpuModule,
    DisplayModule,
    EventsModule,
    FilesystemModule,
    GraphicsModule,
    MediaModule,
    MemoryModule,
    NetworkModule,
    NotificationModule,
    OpenModule,
    OsModule,
    ProcessesModule,
    SystemModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
