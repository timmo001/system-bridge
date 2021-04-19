import { Module } from '@nestjs/common';
import { OpenService } from './open.service';
import { OpenController } from './open.controller';

@Module({
  controllers: [OpenController],
  providers: [OpenService]
})
export class OpenModule {}
