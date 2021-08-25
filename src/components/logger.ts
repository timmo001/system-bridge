import {
  createLogger,
  format,
  Logger as WinstonLogger,
  transports,
} from "winston";
import { join } from "path";

export const LOG_PATH =
  process.env.LOG_PATH ||
  join(
    process.env.APP_PATH ||
      process.env.APPDATA ||
      (process.platform == "darwin"
        ? process.env.HOME + "/Library/Preferences"
        : process.env.HOME + "/.local/share"),
    "system-bridge",
    "system-bridge.log"
  );

export class Logger {
  public logger: WinstonLogger;

  constructor(name?: string) {
    const logFormat = format.printf((info) => {
      const { timestamp, level, stack } = info;
      let { message } = info;
      // print the stack if we have it, message otherwise.
      message = stack || message;
      try {
        if (typeof message === "object") message = JSON.stringify(message);
      } catch (e) {
        console.log(e);
      }
      return name
        ? `${timestamp} ${level}: ${name} - ${message}`
        : `${timestamp} ${level}: ${message}`;
    });

    const tps = [];
    tps.push(
      new transports.Console({
        format: format.combine(
          format.splat(),
          format.simple(),
          format.colorize(),
          logFormat
        ),
      })
    );
    // tps.push(
    //   new transports.File({
    //     filename: LOG_PATH,
    //     format: format.combine(format.errors({ stack: true }), logFormat),
    //   })
    // );

    // Configure the Winston logger.
    this.logger = createLogger({
      level: process.env.NODE_ENV === "development" ? "debug" : "info",
      format: format.combine(
        format.splat(),
        format.simple(),
        format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" })
      ),
      transports: tps,
    });
  }
}
