import { Injectable, CanActivate, ExecutionContext } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { async, Observable } from "rxjs";
import { Repository } from "typeorm";

import { getApiKey } from "./common";
import { Setting } from "./settings/entities/setting.entity";

@Injectable()
export class HttpAuthGuard implements CanActivate {
  private apiKey: string;

  constructor(
    @InjectRepository(Setting)
    private settingsRepository: Repository<Setting>
  ) {
    (async () => {
      this.apiKey = await getApiKey(this.settingsRepository);
    })();
  }

  canActivate(
    context: ExecutionContext
  ): boolean | Promise<boolean> | Observable<boolean> {
    const request = context.switchToHttp().getRequest();
    return request.headers["api-key"] === this.apiKey;
  }
}
