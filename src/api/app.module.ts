import { Module } from "@nestjs/common";
import { WinstonModule } from "nest-winston";

import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import logger from "../logger";

@Module({
  imports: [WinstonModule.forRoot(logger)],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
