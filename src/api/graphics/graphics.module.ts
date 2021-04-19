import { Module } from '@nestjs/common';
import { GraphicsService } from './graphics.service';
import { GraphicsController } from './graphics.controller';

@Module({
  controllers: [GraphicsController],
  providers: [GraphicsService]
})
export class GraphicsModule {}
