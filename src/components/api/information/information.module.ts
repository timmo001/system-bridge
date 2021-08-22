import { Module } from "@nestjs/common";
import { InformationService } from "./information.service";
import { InformationController } from "./information.controller";

@Module({
  controllers: [InformationController],
  providers: [InformationService],
})
export class InformationModule {}
