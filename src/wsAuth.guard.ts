import { Injectable, CanActivate, ExecutionContext } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Observable } from "rxjs";
import { Repository } from "typeorm";

import { getApiKey } from "./common";
import { Setting } from "./settings/entities/setting.entity";

@Injectable()
export class WsAuthGuard implements CanActivate {
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
    const data = context.switchToWs().getData();
    return data["api-key"] === this.apiKey;
  }
}
