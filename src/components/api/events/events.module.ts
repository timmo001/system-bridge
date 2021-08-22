import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { EventsGateway } from "./events.gateway";
import { Setting } from "../settings/entities/setting.entity";

@Module({
  providers: [EventsGateway],
  imports: [TypeOrmModule.forFeature([Setting])],
  exports: [TypeOrmModule],
})
export class EventsModule {}
