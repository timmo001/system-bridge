import { Injectable, CanActivate } from "@nestjs/common";
import { Observable } from "rxjs";

// import { getSettings } from "../common";

@Injectable()
export class WsAuthGuard implements CanActivate {
  // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types, @typescript-eslint/no-explicit-any
  canActivate(context: any): boolean | Promise<boolean> | Observable<boolean> {
    console.log(context.args[0].handshake.headers.authorization);
    const handshake = context.switchToWs().getClient().handshake;
    console.log(handshake.headers.authorization);
    // const settings = getSettings();
    // return request.headers["api-key"] === settings.network.items.apiKey.value;
    return false;
  }
}
