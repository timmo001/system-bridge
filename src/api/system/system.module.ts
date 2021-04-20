import { Module } from '@nestjs/common';
import { SystemService } from './system.service';
import { SystemController } from './system.controller';

@Module({
  controllers: [SystemController],
  providers: [SystemService]
})
export class SystemModule {}
