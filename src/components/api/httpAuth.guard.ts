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
import queryString from "query-string";

import { getApiKey } from "../common";
import { InformationService } from "./information/information.service";
import { Logger } from "../logger";
import { Setting } from "./settings/entities/setting.entity";

@Injectable()
export class HttpAuthGuard implements CanActivate {
  private apiKey: string;

  constructor(
    @InjectRepository(Setting)
    private settingsRepository: Repository<Setting>
  ) {
    setTimeout(async () => {
      this.apiKey = await getApiKey(this.settingsRepository);
      if (process.env.SB_CLI === "true") {
        const { logger } = new Logger();

        const { address, host, apiPort, websocketPort } =
          await new InformationService().findAll();

        logger.info(`Your api-key is: ${this.apiKey}`);
        logger.info(
          `You can access settings for the app via: ${address}/app/settings?${queryString.stringify(
            {
              apiHost: host,
              apiKey: this.apiKey,
              apiPort: apiPort,
              wsPort: websocketPort,
            }
          )}`
        );
        logger.close();
      }
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

    const apiKey = request.headers["api-key"] || request.query["apiKey"];

    return apiKey === this.apiKey;
  }
}
