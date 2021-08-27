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

const { logger } = new Logger("HttpAuthGuard");
@Injectable()
export class HttpAuthGuard implements CanActivate {
  private apiKey: string;

  constructor(
    @InjectRepository(Setting)
    private settingsRepository: Repository<Setting>
  ) {
    setTimeout(async () => {
      this.apiKey = await getApiKey(this.settingsRepository);
      if (process.env.CLI_ONLY === "true")
        logger.info("Your api-key is:", this.apiKey);
    }, 4000);
  }

  canActivate(
    context: ExecutionContext
  ): boolean | Promise<boolean> | Observable<boolean> {
    if (!this.apiKey)
      throw new HttpException(
        { status: HttpStatus.SERVICE_UNAVAILABLE },
        HttpStatus.SERVICE_UNAVAILABLE
      );

    const request = context.switchToHttp().getRequest();

    logger.info(
      `${request.headers["api-key"]} === ${this.apiKey}: ${
        request.headers["api-key"] === this.apiKey
      }`
    );

    return request.headers["api-key"] === this.apiKey;
  }
}
