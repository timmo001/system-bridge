import { config } from "dotenv";

import { getVersion } from "./components/common";
import { openTray, startServer } from "./components/main";
import logger from "./components/logger";

config();

const version = getVersion();

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

startServer();
if (process.env.NODE_ENV !== "development" && process.env.SB_TRAY !== "false")
  openTray();
