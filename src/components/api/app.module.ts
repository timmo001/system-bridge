import { APP_GUARD } from "@nestjs/core";
import { join } from "path";
import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { appDataDirectory } from "../common";
import { AudioModule } from "./audio/audio.module";
import { BatteryModule } from "./battery/battery.module";
import { BluetoothModule } from "./bluetooth/bluetooth.module";
import { CommandModule } from "./command/command.module";
import { CpuModule } from "./cpu/cpu.module";
import { DisplayModule } from "./display/display.module";
import { EventsModule } from "./events/events.module";
import { FilesystemModule } from "./filesystem/filesystem.module";
import { FrontendModule } from "./frontend/frontend.module";
import { GraphicsModule } from "./graphics/graphics.module";
import { HttpAuthGuard } from "./httpAuth.guard";
import { InformationModule } from "./information/information.module";
import { KeyboardModule } from "./keyboard/keyboard.module";
import { LogsModule } from "./logs/logs.module";
import { MemoryModule } from "./memory/memory.module";
import { NetworkModule } from "./network/network.module";
import { NotificationModule } from "./notification/notification.module";
import { OpenModule } from "./open/open.module";
import { OsModule } from "./os/os.module";
import { ProcessesModule } from "./processes/processes.module";
import { SettingsModule } from "./settings/settings.module";
import { SystemModule } from "./system/system.module";
import { UsbModule } from "./usb/usb.module";

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: "better-sqlite3",
      database: join(appDataDirectory, "system-bridge_v1.db"),
      autoLoadEntities: true,
      logging: false,
      synchronize: true,
    }),
    AudioModule,
    BatteryModule,
    BluetoothModule,
    CommandModule,
    CpuModule,
    DisplayModule,
    EventsModule,
    FilesystemModule,
    FrontendModule,
    GraphicsModule,
    InformationModule,
    KeyboardModule,
    LogsModule,
    MemoryModule,
    NetworkModule,
    NotificationModule,
    OpenModule,
    OsModule,
    ProcessesModule,
    SettingsModule,
    SystemModule,
    UsbModule,
  ],
  controllers: [],
  providers: [
    {
      provide: APP_GUARD,
      useClass: HttpAuthGuard,
    },
  ],
})
export class AppModule {}
