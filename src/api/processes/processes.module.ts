import { Module } from '@nestjs/common';
import { ProcessesService } from './processes.service';
import { ProcessesController } from './processes.controller';

@Module({
  controllers: [ProcessesController],
  providers: [ProcessesService]
})
export class ProcessesModule {}
