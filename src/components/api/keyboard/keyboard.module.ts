import { Module } from "@nestjs/common";
import { KeyboardService } from "./keyboard.service";
import { KeyboardController } from "./keyboard.controller";

@Module({
  controllers: [KeyboardController],
  providers: [KeyboardService],
})
export class KeyboardModule {}
