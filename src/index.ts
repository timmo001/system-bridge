import { config } from "dotenv";
import { existsSync, mkdirSync } from "fs";
import { join } from "path";
import execa, { ExecaChildProcess, NodeOptions } from "execa";

import { appDataDirectory, getVersion } from "./components/common";
import { Logger } from "./components/logger";

interface Process {
  [name: string]: ExecaChildProcess;
}

const PATH_API = "dist/components/api/index.js";
const PATH_TRAY = "tray/dist/index.js";
const PATH_TRAY_EXE = "system-bridge-tray.exe";

const DEFAULT_ENV = {
  NODE_ENV: process.env.NODE_ENV,
  SB_PACKAGED: process.env.SB_PACKAGED,
  SB_USE_CWD: "true",
};

const DEFAULT_OPTIONS: NodeOptions = {
  cleanup: true,
  cwd: join(__dirname, ".."),
  env: DEFAULT_ENV,
  execPath: __dirname,
};

const DEFAULT_EXE_OPTIONS: NodeOptions = {
  cleanup: true,
  cwd: process.cwd(),
  env: DEFAULT_ENV,
  execPath: process.cwd(),
};

// Get process environment variables
config();

const { logger } = new Logger();

// Setup app data directory
if (!existsSync(appDataDirectory)) mkdirSync(appDataDirectory);

// Get version
const version = getVersion(logger);

// Startup log
logger.info(
  `System Bridge ${version}: ${process.cwd()} - ${JSON.stringify(
    process.argv
  )} - ${process.env.NODE_ENV}`
);
logger.close();

const processes: Process = {};

function setupSubprocess(name: string): ExecaChildProcess | null {
  let subprocess: ExecaChildProcess;
  switch (name) {
    default:
      return null;
    case "api":
      subprocess = execa.node(PATH_API, [], DEFAULT_OPTIONS);
      break;
    case "tray":
      subprocess =
        process.env.SB_PACKAGED !== "false"
          ? execa(PATH_TRAY_EXE, [], DEFAULT_EXE_OPTIONS)
          : execa.node(PATH_TRAY, [], DEFAULT_OPTIONS);
      break;
  }

  subprocess.stdout.pipe(process.stdout);
  subprocess.stderr.pipe(process.stderr);

  const { logger } = new Logger("Process Manager");
  logger.info(`Starting ${name} - ${JSON.stringify(subprocess.spawnargs)}`);
  logger.close();

  subprocess.on("error", (error: Error) => {
    logger.error(`${name} error: ${error.message}`);
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
      logger.info(`${name}: Exited with code: ${code} - ${processes}`);
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

process.on("beforeExit", () => killAllProcesses());
process.on("SIGKILL", () => killAllProcesses());
process.on("SIGTERM", () => killAllProcesses());

processes.api = setupSubprocess("api");
if (process.env.SB_TRAY !== "false") processes.tray = setupSubprocess("tray");
