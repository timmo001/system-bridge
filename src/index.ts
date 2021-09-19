import { config } from "dotenv";
import { existsSync, mkdirSync } from "fs";
import execa, { ExecaChildProcess, NodeOptions } from "execa";

import { appDataDirectory, getVersion } from "./components/common";
import { Logger } from "./components/logger";

interface Process {
  [name: string]: ExecaChildProcess;
}

const PATH_API = "dist/components/api/index.js";
const PATH_TRAY = "dist/components/tray.js";

const DEFAULT_ENV = {
  NODE_ENV: process.env.NODE_ENV,
  SB_USE_CWD: "true",
};

const DEFAULT_OPTIONS: NodeOptions = {
  cleanup: true,
  cwd: process.cwd(),
  env: DEFAULT_ENV,
  execPath: __dirname,
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

let processes: Process = {};

function setupSubprocess(name: string): ExecaChildProcess | null {
  const { logger } = new Logger("Process Manager");
  logger.info(`Starting ${name}`);
  logger.close();
  let subprocess: ExecaChildProcess;
  switch (name) {
    default:
      return null;
    case "api":
      subprocess = execa.node(PATH_API, [], DEFAULT_OPTIONS);
    case "tray":
      subprocess = execa.node(PATH_TRAY, [], DEFAULT_OPTIONS);
  }

  subprocess.stdout.pipe(process.stdout);
  subprocess.stderr.pipe(process.stderr);

  subprocess.on("exit", (code: number | null) => {
    const { logger } = new Logger("Process Manager");
    logger.info(`${name}: Exited with code: ${code}`);
    if (code !== 0) {
      logger.info(`${name}: Restarting in 5 seconds`);
      logger.close();
      setTimeout(() => {
        // Recreate process
        processes[name] = setupSubprocess(name);
      }, 5000);
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

processes = {
  api: setupSubprocess("api"),
  tray: setupSubprocess("tray"),
};
