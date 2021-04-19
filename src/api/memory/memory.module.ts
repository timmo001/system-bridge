import { Module } from '@nestjs/common';
import { MemoryService } from './memory.service';
import { MemoryController } from './memory.controller';

@Module({
  controllers: [MemoryController],
  providers: [MemoryService]
})
export class MemoryModule {}
