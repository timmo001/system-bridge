import { Module } from '@nestjs/common';
import { BatteryService } from './battery.service';
import { BatteryController } from './battery.controller';

@Module({
  controllers: [BatteryController],
  providers: [BatteryService]
})
export class BatteryModule {}
