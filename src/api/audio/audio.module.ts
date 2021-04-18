import { Module } from '@nestjs/common';
import { AudioService } from './audio.service';
import { AudioController } from './audio.controller';

@Module({
  controllers: [AudioController],
  providers: [AudioService]
})
export class AudioModule {}
