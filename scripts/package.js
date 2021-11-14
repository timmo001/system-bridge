const { copySync, existsSync, mkdirSync } = require("fs-extra");
const { exec } = require("pkg");
const { join } = require("path");

console.log("Package..", [process.env.SB_CLI]);

const filePaths = [
  {
    from: "../LICENSE",
    to: "../out/LICENSE",
  },
  {
    from: "../package.json",
    to: "../out/package.json",
  },
  {
    from: "../public/system-bridge-circle.png",
    to: "../out/system-bridge-circle.png",
  },
  {
    from: "../public/system-bridge-circle.ico",
    to: "../out/system-bridge-circle.ico",
  },
  {
    from: "../public/system-bridge-circle.icns",
    to: "../out/system-bridge-circle.icns",
  },
  {
    from: "../gui/dist/system-bridge-gui",
    to: "../out/system-bridge-gui",
    cli: false,
  },
  {
    from: "../node_modules/node-notifier/vendor/notifu/notifu.exe",
    to: "../out/notifier/notifu.exe",
    platform: "win32",
    cli: false,
  },
  {
    from: "../node_modules/node-notifier/vendor/notifu/notifu64.exe",
    to: "../out/notifier/notifu64.exe",
    platform: "win32",
    cli: false,
  },
  {
    from: "../node_modules/node-notifier/vendor/terminal-notifier.app/Contents/MacOS/terminal-notifier",
    to: "../out/notifier/terminal-notifier",
    platform: "darwin",
    cli: false,
  },
  {
    from: "../node_modules/node-notifier/vendor/snoreToast/snoretoast-x64.exe",
    to: "../out/notifier/snoretoast-x64.exe",
    platform: "win32",
    cli: false,
  },
  {
    from: "../node_modules/node-notifier/vendor/snoreToast/snoretoast-x86.exe",
    to: "../out/notifier/snoretoast-x86.exe",
    platform: "win32",
    cli: false,
  },
  {
    from: "../node_modules/open/xdg-open",
    to: "../out/xdg-open",
    cli: false,
  },
  {
    from: "../node_modules/system-bridge-windows-sensors/dist/WindowsSensors/HidSharp.dll",
    to: "../out/WindowsSensors/HidSharp.dll",
    platform: "win32",
  },
  {
    from: "../node_modules/system-bridge-windows-sensors/dist/WindowsSensors/HidSharp.pdb",
    to: "../out/WindowsSensors/HidSharp.pdb",
    platform: "win32",
  },
  {
    from: "../node_modules/system-bridge-windows-sensors/dist/WindowsSensors/HidSharp.xml",
    to: "../out/WindowsSensors/HidSharp.xml",
    platform: "win32",
  },
  {
    from: "../node_modules/system-bridge-windows-sensors/dist/WindowsSensors/LibreHardwareMonitorLib.dll",
    to: "../out/WindowsSensors/LibreHardwareMonitorLib.dll",
    platform: "win32",
  },
  {
    from: "../node_modules/system-bridge-windows-sensors/dist/WindowsSensors/Newtonsoft.Json.dll",
    to: "../out/WindowsSensors/Newtonsoft.Json.dll",
    platform: "win32",
  },
  {
    from: "../node_modules/system-bridge-windows-sensors/dist/WindowsSensors/Newtonsoft.Json.xml",
    to: "../out/WindowsSensors/Newtonsoft.Json.xml",
    platform: "win32",
  },
  {
    from: "../node_modules/system-bridge-windows-sensors/dist/WindowsSensors/NvAPIWrapper.dll",
    to: "../out/WindowsSensors/NvAPIWrapper.dll",
    platform: "win32",
  },
  {
    from: "../node_modules/system-bridge-windows-sensors/dist/WindowsSensors/NvAPIWrapper.xml",
    to: "../out/WindowsSensors/NvAPIWrapper.xml",
    platform: "win32",
  },
  {
    from: "../node_modules/system-bridge-windows-sensors/dist/WindowsSensors/Newtonsoft.Json.xml",
    to: "../out/WindowsSensors/Newtonsoft.Json.xml",
    platform: "win32",
  },
  {
    from: "../node_modules/system-bridge-windows-sensors/dist/WindowsSensors/SystemBridgeWindowsSensors.exe",
    to: "../out/WindowsSensors/SystemBridgeWindowsSensors.exe",
    platform: "win32",
  },
];

async function package() {
  // await exec([
  //   join(__dirname, "../"),
  //   "--output",
  //   join(
  //     __dirname,
  //     `../out/system-bridge${process.platform === "win32" ? ".exe" : ""}`
  //   ),
  //   "--options",
  //   "--max_old_space_size=4096",
  // ]);

  filePaths
    .filter((path) => {
      const shouldCopy =
        process.env.SB_CLI && path.cli === false
          ? false
          : path.platform
          ? path.platform === process.platform
          : true;

      console.log(`${path.from} -> ${path.to}`, shouldCopy ? "✅" : "❌");

      return shouldCopy;
    })
    .forEach((path) => {
      const sourceFile = join(__dirname, path.from);
      const targetFile = join(__dirname, path.to);
      const sourceExists = existsSync(sourceFile);
      console.log(
        `Copy ${sourceFile} -> ${targetFile}`,
        sourceExists ? "✅" : "❌"
      );
      if (sourceExists) {
        const targetDir = join(
          __dirname,
          path.to.substring(0, path.to.lastIndexOf("/"))
        );
        if (!existsSync(targetDir)) mkdirSync(targetDir);
        copySync(sourceFile, targetFile, {});
      }
    });
}

(async () => {
  package();
})();
