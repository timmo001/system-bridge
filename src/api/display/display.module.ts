import { Module } from '@nestjs/common';
import { DisplayService } from './display.service';
import { DisplayController } from './display.controller';

@Module({
  controllers: [DisplayController],
  providers: [DisplayService]
})
export class DisplayModule {}
