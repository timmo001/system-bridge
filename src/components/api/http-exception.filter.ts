import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
} from "@nestjs/common";
import { Request, Response } from "express";

import { Logger } from "../logger";

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();
    const status = exception.getStatus();
    let exceptionResponse = exception.getResponse();

    if (typeof exceptionResponse !== "object") {
      exceptionResponse = {};
    }

    exceptionResponse = {
      ...exceptionResponse,
      body: request.body,
      message: exception.message,
      path: request.url,
    };

    const { logger } = new Logger("API Execption");
    logger.warn(`HTTP Exception: ${JSON.stringify(exceptionResponse)}`);
    logger.close();

    response.status(status).json(exceptionResponse);
  }
}
