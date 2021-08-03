import { createLogger, format, transports } from "winston";
import { existsSync, mkdirSync } from "fs";
import { join } from "path";

// Setup app data directory
export const appDataDir = join(
  process.env.APP_PATH ||
    process.env.APPDATA ||
    (process.platform == "darwin"
      ? process.env.HOME + "/Library/Preferences"
      : process.env.HOME + "/.local/share"),
  "system-bridge"
);
if (!existsSync(appDataDir)) mkdirSync(appDataDir);

export const logsPath = join(
  process.env.LOG_PATH || appDataDir,
  "system-bridge.log"
);

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

const tps = [];
tps.push(
  new transports.Console({
    format: format.combine(
      format.splat(),
      format.simple(),
      format.colorize(),
      logFormat
    ),
    handleExceptions: true,
  })
);
tps.push(
  new transports.File({
    filename: logsPath,
    format: format.combine(format.errors({ stack: true }), logFormat),
    handleExceptions: true,
  })
);

// Configure the Winston logger.
const logger = createLogger({
  level: process.env.NODE_ENV === "development" ? "debug" : "info",
  format: format.combine(
    format.splat(),
    format.simple(),
    format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" })
  ),
  transports: tps,
});

export default logger;
