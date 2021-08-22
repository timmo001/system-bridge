import { join } from "path";
import execa from "execa";

import logger from "./logger";

export async function openTray(): Promise<void> {
  try {
    const workingDirectory = process.execPath.substring(
      0,
      process.platform === "win32"
        ? process.execPath.lastIndexOf("\\")
        : process.execPath.lastIndexOf("/")
    );
    const trayPath = join(
      workingDirectory,
      `./system-bridge-tray${process.platform === "win32" ? ".exe" : ""}`
    );
    logger.info(`Main - Open Tray: ${trayPath}`);
    const trayProcess = execa(trayPath, [], {
      cwd: workingDirectory,
      windowsHide: true,
    });
    trayProcess.catch((e) =>
      logger.error(`Main - Error inside tray: ${e.message}`)
    );
    trayProcess.on("close", (code: string) => {
      logger.error(`Main - Tray closed with code: ${code}`);
      logger.info("Main - Tray reopening in 10 seconds...");
      setTimeout(() => openTray(), 10000);
    });
  } catch (e) {
    logger.error(`Main - Error opening tray: ${e.message}`);
    logger.info("Main - Retrying in 10 seconds...");
    setTimeout(() => openTray(), 10000);
  }
}
