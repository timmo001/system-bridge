import { config } from "dotenv";
import { existsSync, mkdirSync, readdirSync } from "fs";
import { join } from "path";
import execa, { ExecaChildProcess, NodeOptions } from "execa";

import { appDataDirectory, getVersion } from "./components/common";
import { Logger } from "./components/logger";

interface Process {
  [name: string]: ExecaChildProcess;
}

const PATH_API = "dist/main";
const PATH_TRAY = "tray/dist/tray";
const PATH_TRAY_EXE = "system-bridge-tray.exe";

const DEFAULT_ENV = {
  NODE_ENV: process.env.NODE_ENV,
  SB_USE_CWD: "true",
};

const DEFAULT_OPTIONS: NodeOptions = {
  cleanup: true,
  cwd: join(__dirname, ".."),
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

const processes: Process = {};

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
      break;
    case "tray":
      subprocess =
        process.env.SB_PACKAGED === "true"
          ? execa(PATH_TRAY_EXE, [], DEFAULT_OPTIONS)
          : execa.node(PATH_TRAY, [], DEFAULT_OPTIONS);
      break;
  }

  subprocess.stdout.pipe(process.stdout);
  subprocess.stderr.pipe(process.stderr);

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
    } else logger.info(`${name}: Exited with code: ${code}`);
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

function logDirs(): void {
  const { logger } = new Logger("Process Manager");

  logger.info(`------------------------------------------------------`);
  logger.info(`process.cwd(): ${process.cwd()}`);
  logger.info(`------------------------------------------------------`);

  for (const file of readdirSync(process.cwd())) {
    logger.info(file);
  }

  logger.info(`------------------------------------------------------`);
  logger.info(`__dirname: ${__dirname}`);
  logger.info(`------------------------------------------------------`);

  for (const file of readdirSync(__dirname)) {
    logger.info(file);
  }

  logger.info(`------------------------------------------------------`);
  logger.info(`join(__dirname, ".."): ${join(__dirname, "..")}`);
  logger.info(`------------------------------------------------------`);

  for (const file of readdirSync(join(__dirname, ".."))) {
    logger.info(file);
  }

  // logger.info(`------------------------------------------------------`);
  // logger.info(
  //   `join(__dirname, "..", "node_modules"): ${join(
  //     __dirname,
  //     "..",
  //     "node_modules"
  //   )}`
  // );
  // logger.info(`------------------------------------------------------`);

  // for (const file of readdirSync(join(__dirname, "..", "node_modules"))) {
  //   logger.info(file);
  // }

  logger.info(`------------------------------------------------------`);
  logger.info(
    `join(__dirname, "..", "node_modules", "systray2"): ${join(
      __dirname,
      "..",
      "node_modules",
      "systray2"
    )}`
  );
  logger.info(`------------------------------------------------------`);

  for (const file of readdirSync(
    join(__dirname, "..", "node_modules", "systray2")
  )) {
    logger.info(file);
  }

  logger.info(`------------------------------------------------------`);
  logger.info(
    `join(__dirname, "..", "node_modules", "systray2", "traybin"): ${join(
      __dirname,
      "..",
      "node_modules",
      "systray2",
      "traybin"
    )}`
  );
  logger.info(`------------------------------------------------------`);

  for (const file of readdirSync(
    join(__dirname, "..", "node_modules", "systray2", "traybin")
  )) {
    logger.info(file);
  }

  logger.close();
}

logDirs();

processes.api = setupSubprocess("api");
if (process.env.SB_TRAY !== "false") processes.tray = setupSubprocess("tray");
