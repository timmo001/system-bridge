import { config } from "dotenv";
import { existsSync, mkdirSync } from "fs";

import { appDataDirectory, getVersion } from "./components/common";
import { openTray } from "./components/tray";
import { startServer } from "./components/api";
import { Logger } from "./components/logger";

// Get process environment variables
config();

const { logger } = new Logger();

// Setup app data directory
if (!existsSync(appDataDirectory)) mkdirSync(appDataDirectory);

// Get version
const version = getVersion(logger);

// Startup log
logger.info(
  "-----------------------------------------------------------------------------------------------------------------------"
);
logger.info(
  `System Bridge ${version}: ${JSON.stringify(process.argv)} - ${
    process.env.NODE_ENV
  }`
);
logger.info(
  "-----------------------------------------------------------------------------------------------------------------------"
);
logger.close();

// Start server
startServer();

// Open tray if not in production
if (process.env.NODE_ENV !== "development" && process.env.SB_TRAY !== "false")
  openTray();
