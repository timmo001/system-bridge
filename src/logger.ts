import { app } from "electron";
import { join } from "path";
import { createLogger, format, transports } from "winston";

import electronIsDev from "./electronIsDev";

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
    format: format.combine(format.colorize(), logFormat),
    handleExceptions: true,
  })
);
if (app)
  tps.push(
    new transports.File({
      filename: join(app.getPath("userData"), "system-bridge.log"),
      format: format.combine(format.errors({ stack: true }), logFormat),
      handleExceptions: true,
    })
  );

// Configure the Winston logger.
const logger = createLogger({
  level: electronIsDev() ? "debug" : "info",
  format: format.combine(
    format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    // Format the metadata object
    format.metadata({ fillExcept: ["message", "level", "timestamp", "label"] }),
    format.errors({ stack: true })
  ),
  transports: tps,
});

export default logger;
