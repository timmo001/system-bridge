import { Module } from '@nestjs/common';
import { NetworkService } from './network.service';
import { NetworkController } from './network.controller';

@Module({
  controllers: [NetworkController],
  providers: [NetworkService]
})
export class NetworkModule {}
