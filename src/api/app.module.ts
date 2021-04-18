import { Module } from "@nestjs/common";
import { WinstonModule } from "nest-winston";
import { AudioModule } from './audio/audio.module';
import { MediaModule } from './media/media.module';
import logger from "../logger";

@Module({
  imports: [WinstonModule.forRoot(logger), AudioModule, MediaModule],
  controllers: [],
  providers: [],
})
export class AppModule {}
