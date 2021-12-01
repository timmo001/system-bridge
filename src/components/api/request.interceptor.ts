import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from "@nestjs/common";
import { Observable } from "rxjs";
import { Logger } from "../logger";

@Injectable()
export class RequestInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();
    const { statusCode } = context.switchToHttp().getResponse();
    const { originalUrl, method, params, query } = req;

    const paramsString = JSON.stringify(params);
    const queryString = JSON.stringify(query);

    const { logger } = new Logger("RequestInterceptor");
    logger.info(
      `${method}: ${originalUrl}${
        paramsString !== "{}" || queryString !== "{}"
          ? ` - ${paramsString} - ${queryString}`
          : ""
      } - ${statusCode}`
    );
    logger.close();

    return next.handle();
  }
}
