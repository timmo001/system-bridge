import { Module } from "@nestjs/common";
import { LogsService } from "./logs.service";
import { LogsController } from "./logs.controller";

@Module({
  controllers: [LogsController],
  providers: [LogsService],
})
export class LogsModule {}
