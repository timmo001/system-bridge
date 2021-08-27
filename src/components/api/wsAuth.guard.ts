import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Observable } from "rxjs";
import { Repository } from "typeorm";

import { getApiKey } from "../common";
import { Logger } from "../logger";
import { Setting } from "./settings/entities/setting.entity";

const { logger } = new Logger("WsAuthGuard");

@Injectable()
export class WsAuthGuard implements CanActivate {
  private apiKey: string;

  constructor(
    @InjectRepository(Setting)
    private settingsRepository: Repository<Setting>
  ) {
    (async () => {
      this.apiKey = await getApiKey(this.settingsRepository);
      if (process.env.CLI_ONLY === "true")
        logger.info("Your api-key is:", this.apiKey);
    })();
  }

  canActivate(
    context: ExecutionContext
  ): boolean | Promise<boolean> | Observable<boolean> {
    if (!this.apiKey)
      throw new HttpException(
        { status: HttpStatus.SERVICE_UNAVAILABLE },
        HttpStatus.SERVICE_UNAVAILABLE
      );
    const data = context.switchToWs().getData();
    return data["api-key"] === this.apiKey;
  }
}
