import { Module } from "@nestjs/common";
import { WinstonModule } from "nest-winston";
import { AudioModule } from './audio/audio.module';
import logger from "../logger";

@Module({
  imports: [WinstonModule.forRoot(logger), AudioModule],
  controllers: [],
  providers: [],
})
export class AppModule {}
