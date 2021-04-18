import { Module } from "@nestjs/common";
import { WinstonModule } from "nest-winston";

import logger from "../logger";

@Module({
  imports: [WinstonModule.forRoot(logger)],
  controllers: [],
  providers: [],
})
export class AppModule {}
