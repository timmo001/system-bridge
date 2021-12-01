import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from "@nestjs/common";
import { Logger } from "../logger";

@Injectable()
export class RequestInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler) {
    const req = context.switchToHttp().getRequest();
    const { statusCode } = context.switchToHttp().getResponse();
    const { originalUrl, method, params, query } = req;

    const { logger } = new Logger("RequestInterceptor");
    logger.info(
      `${method}: ${originalUrl} - ${JSON.stringify(params)} - ${JSON.stringify(
        query
      )} - ${statusCode}`
    );

    return next.handle();
  }
}
