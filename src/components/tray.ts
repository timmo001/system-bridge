import { join } from "path";
import execa from "execa";

import { Logger } from "./logger";

const logger = new Logger("Tray");

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
    logger.info(`Open Tray: ${trayPath}`);
    const trayProcess = execa(trayPath, [], {
      cwd: workingDirectory,
      windowsHide: true,
    });
    trayProcess.catch((e) => logger.error(`Error inside tray: ${e.message}`));
    trayProcess.on("close", (code: string) => {
      logger.error(`Tray closed with code: ${code}`);
      logger.info("Tray reopening in 10 seconds...");
      setTimeout(() => openTray(), 10000);
    });
  } catch (e) {
    logger.error(`Error opening tray: ${e.message}`);
    logger.info("Retrying in 10 seconds...");
    setTimeout(() => openTray(), 10000);
  }
}
