import { Notification } from "electron";
import isDev from "electron-is-dev";
import { createLogger, format, transports } from "winston";

import { appIconPath } from ".";

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
  if (level.includes("error"))
    new Notification({
      title: "An error occured",
      body: message,
      icon: appIconPath,
    }).show();
  return `${timestamp} ${level}: ${message}`;
});

// Configure the Winston logger.
const logger = createLogger({
  level: isDev ? "info" : "debug",
  format: format.combine(
    format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    // Format the metadata object
    format.metadata({ fillExcept: ["message", "level", "timestamp", "label"] }),
    format.errors({ stack: true })
  ),
  transports: [
    new transports.Console({
      format: format.combine(format.colorize(), logFormat),
      handleExceptions: true,
    }),
    new transports.File({
      filename: "logs/app.log",
      format: format.combine(format.errors({ stack: true }), logFormat),
      handleExceptions: true,
    }),
  ],
});

export default logger;
