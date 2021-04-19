import { Module } from '@nestjs/common';
import { CommandService } from './command.service';
import { CommandController } from './command.controller';

@Module({
  controllers: [CommandController],
  providers: [CommandService]
})
export class CommandModule {}
