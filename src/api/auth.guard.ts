import { Injectable, CanActivate, ExecutionContext } from "@nestjs/common";
import { Observable } from "rxjs";

import { getSettings } from "../common";

@Injectable()
export class AuthGuard implements CanActivate {
  canActivate(
    context: ExecutionContext
  ): boolean | Promise<boolean> | Observable<boolean> {
    const request = context.switchToHttp().getRequest();

    console.log(request);

    const settings = getSettings();
    // if (!settings) return false;

    return request !== settings.network.items.apiKey.value;
  }
}
