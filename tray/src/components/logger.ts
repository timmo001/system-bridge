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
  private logger: WinstonLogger;
  private name: string;

  constructor(name?: string) {
    this.name = name;

    if (!this.logger) {
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
        return `${timestamp} ${level}: ${message}`;
      });

      // Configure the Winston logger.
      this.logger = createLogger({
        level: process.env.NODE_ENV === "development" ? "debug" : "info",
        format: format.combine(
          format.splat(),
          format.simple(),
          format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" })
        ),
        transports: [
          new transports.Console({
            format: format.combine(
              format.splat(),
              format.simple(),
              format.colorize(),
              logFormat
            ),
          }),
          new transports.File({
            filename: LOG_PATH,
            format: format.combine(format.errors({ stack: true }), logFormat),
          }),
        ],
      });
    }
  }

  log(level: string, message: string) {
    this.logger.log(level, this.name ? `${this.name} - ${message}` : message);
  }

  public debug(message: string) {
    this.log("debug", message);
  }

  public info(message: string) {
    this.log("info", message);
  }

  public warn(message: string) {
    this.log("warn", message);
  }

  public error(message: string) {
    this.log("error", message);
  }
}
