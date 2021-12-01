import { config } from "dotenv";
import { existsSync, mkdirSync } from "fs";
import { dirname, join } from "path";
import execa, { ExecaChildProcess, NodeOptions } from "execa";

import {
  appDataDirectory,
  getConnection,
  getSettingsObject,
  getVersion,
} from "./components/common";
import { Logger } from "./components/logger";

interface Process {
  [name: string]: ExecaChildProcess;
}

// Get process environment variables
config();

const PATH_API = join(__dirname, "components/api/index.js");
const PATH_API_PACKAGED = join(
  dirname(process.execPath),
  `system-bridge${process.platform === "win32" ? ".exe" : ""}`
);
const PATH_GUI = join(
  __dirname,
  `../gui/dist/system-bridge-gui/system-bridge-gui${
    process.platform === "win32" ? ".exe" : ""
  }`
);
const PATH_GUI_PACKAGED = join(
  dirname(process.execPath),
  `./system-bridge-gui/system-bridge-gui${
    process.platform === "win32" ? ".exe" : ""
  }`
);

const DEFAULT_ENV = {
  NODE_ENV: process.env.NODE_ENV,
  SB_PACKAGED: process.env.SB_PACKAGED,
};

const DEFAULT_OPTIONS: NodeOptions = {
  cleanup: true,
  cwd: join(__dirname, ".."),
  env: DEFAULT_ENV,
};

const DEFAULT_OPTIONS_PACKAGED: NodeOptions = {
  cleanup: true,
  cwd: dirname(process.execPath),
  env: DEFAULT_ENV,
};

let settings: { [key: string]: string };

const { logger } = new Logger();

// Setup app data directory
if (!existsSync(appDataDirectory)) mkdirSync(appDataDirectory);

// Get version
const version = getVersion(logger);

// Startup log
logger.info(
  `System Bridge ${version}: ${[
    dirname(process.execPath),
    process.execPath,
    process.cwd(),
    JSON.stringify(process.argv),
    process.env.NODE_ENV,
    process.env.SB_CLI,
    process.env.SB_PACKAGED,
    process.env.SB_GUI,
  ].join(" - ")}`
);
logger.close();

const processes: Process = {};

function setupSubprocess(name: string): ExecaChildProcess | null {
  let subprocess: ExecaChildProcess;
  const { logger } = new Logger("Process Manager");

  switch (name) {
    default:
      return null;
    case "api":
      logger.info(`PATH_API: ${PATH_API}`);
      subprocess =
        process.env.SB_PACKAGED !== "false"
          ? execa(PATH_API_PACKAGED, [PATH_API], DEFAULT_OPTIONS_PACKAGED)
          : execa.node(PATH_API, [], DEFAULT_OPTIONS);
      break;
    case "gui":
      logger.info(
        `PATH_GUI${process.env.SB_PACKAGED !== "false" ? "_PACKAGED" : ""}: ${
          process.env.SB_PACKAGED !== "false" ? PATH_GUI_PACKAGED : PATH_GUI
        }`
      );
      const guiArgs = [
        "--host",
        "localhost",
        "--api-key",
        settings["network-apiKey"],
        "--api-port",
        settings["network-apiPort"] || "9170",
        "--frontend-port",
        process.env.NODE_ENV === "development"
          ? "3000"
          : settings["network-apiPort"] || "9170",
        "--log-level",
        process.env.NODE_ENV === "development" ? "debug" : "info",
        "--websocket-port",
        settings["network-wsPort"] || "9172",
      ];
      subprocess =
        process.env.SB_PACKAGED !== "false"
          ? execa(PATH_GUI_PACKAGED, guiArgs, DEFAULT_OPTIONS_PACKAGED)
          : execa(PATH_GUI, guiArgs, DEFAULT_OPTIONS);
      break;
  }

  subprocess.stdout.pipe(process.stdout);
  subprocess.stderr.pipe(process.stderr);

  logger.info(
    `Starting ${name} - ${JSON.stringify(
      subprocess.spawnargs.map(
        (value: string, index: number, array: Array<string>) =>
          array[index - 1] === "--api-key" ? "***" : value
      )
    )}`
  );
  logger.close();

  subprocess.on("error", (error: Error) => {
    const { logger } = new Logger("Process Manager");
    logger.error(`${name} error: ${error.message}`);
    logger.close();
  });

  subprocess.on("exit", (code: number | null) => {
    const { logger } = new Logger("Process Manager");
    if (code !== 0) {
      logger.error(`${name}: Exited with code: ${code}`);
      logger.info(`${name}: Restarting in 10 seconds..`);
      logger.close();
      setTimeout(() => {
        // Recreate process
        processes[name] = setupSubprocess(name);
      }, 10000);
    } else {
      logger.info(
        `${name}: Exited with code: ${code} - ${JSON.stringify(
          subprocess.spawnargs
        )}`
      );
      delete processes[name];
      logger.info("Mopping up processes..");
      killAllProcesses();
      logger.info("Closing..");
      logger.close();
      setTimeout(() => {
        process.exit(0);
      }, 2000);
    }
  });

  return subprocess;
}

function killAllProcesses(): void {
  for (const name of Object.keys(processes)) {
    processes[name].kill(0);
  }
}

process.on("uncaughtException", (error: any) => {
  const { logger } = new Logger("Process Manager");
  logger.error(`Uncaught Exception: ${error}`);
  logger.close();
});
process.on("beforeExit", () => killAllProcesses());
process.on("SIGTERM", () => killAllProcesses());

processes.api = setupSubprocess("api");
if (process.env.SB_GUI !== "false") {
  (async () => {
    const connection = await getConnection();
    settings = await getSettingsObject(connection);
    await connection.close();

    processes.gui = setupSubprocess("gui");
  })();
}
