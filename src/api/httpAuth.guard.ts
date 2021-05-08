import { Injectable, CanActivate, ExecutionContext } from "@nestjs/common";
import { Observable } from "rxjs";

import { getSettings } from "../common";

@Injectable()
export class HttpAuthGuard implements CanActivate {
  canActivate(
    context: ExecutionContext
  ): boolean | Promise<boolean> | Observable<boolean> {
    const request = context.switchToHttp().getRequest();
    const settings = getSettings();
    return request.headers["api-key"] === settings.network.items.apiKey.value;
  }
}
