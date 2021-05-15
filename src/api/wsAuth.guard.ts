import { Injectable, CanActivate, ExecutionContext } from "@nestjs/common";
import { Observable } from "rxjs";

import { getSettings } from "../common";

@Injectable()
export class WsAuthGuard implements CanActivate {
  canActivate(
    context: ExecutionContext
  ): boolean | Promise<boolean> | Observable<boolean> {
    const data = context.switchToWs().getData();
    const settings = getSettings();
    return data["api-key"] === settings.network.items.apiKey.value;
  }
}
