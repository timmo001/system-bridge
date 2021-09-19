// import { join } from "path";
// import execa from "execa";

// import { Logger } from "./logger";/*  */
import { startServer } from "./components/api";
// import { setupTray } from "./components/tray";

// export async function openTray(): Promise<void> {
//   const { logger } = new Logger("Tray");

//   try {
//     const workingDirectory = process.execPath.substring(
//       0,
//       process.platform === "win32"
//         ? process.execPath.lastIndexOf("\\")
//         : process.execPath.lastIndexOf("/")
//     );
//     const trayPath = join(
//       workingDirectory,
//       `./system-bridge-tray${process.platform === "win32" ? ".exe" : ""}`
//     );
//     logger.info(`Open Tray: ${trayPath}`);
//     const trayProcess = execa(trayPath, [], {
//       cwd: workingDirectory,
//       windowsHide: true,
//     });
//     trayProcess.catch((e) => {
//       const { logger } = new Logger("Tray");
//       logger.error(`Error inside tray: ${e.message}`);
//       logger.close();
//     });
//     trayProcess.on("close", (code: string) => {
//       const { logger } = new Logger("Tray");
//       logger.error(`Tray closed with code: ${code}`);
//       logger.info("Tray reopening in 10 seconds...");
//       logger.close();
//       setTimeout(() => openTray(), 10000);
//     });
//   } catch (e) {
//     logger.error(`Error opening tray: ${e.message}`);
//     logger.info("Retrying in 10 seconds...");
//     setTimeout(() => openTray(), 10000);
//   }
//   logger.close();
// }

(async () => {
  await startServer();
  // if (process.env.SB_TRAY !== "false") await setupTray();
})();
