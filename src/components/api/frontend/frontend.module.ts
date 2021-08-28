import { Module } from "@nestjs/common";
import { FrontendService } from "./frontend.service";
import { FrontendController } from "./frontend.controller";

@Module({
  controllers: [FrontendController],
  providers: [FrontendService],
})
export class FrontendModule {}
