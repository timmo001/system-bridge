import { Module } from "@nestjs/common";

import { FrontendController } from "./frontend.controller";
import { FrontendService } from "./frontend.service";

@Module({
  controllers: [FrontendController],
  providers: [FrontendService],
})
export class FrontendModule {}
