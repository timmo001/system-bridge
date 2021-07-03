const { copyFileSync, existsSync, mkdirSync } = require("fs");
const { join } = require("path");

const filePaths = [
  {
    from: "../LICENSE",
    to: "LICENSE",
  },
  {
    from: "../node_modules/node-notifier/vendor/notifu/notifu.exe",
    to: "notifier/notifu.exe",
    platform: "win32",
  },
  {
    from: "../node_modules/node-notifier/vendor/notifu/notifu64.exe",
    to: "notifier/notifu64.exe",
    platform: "win32",
  },
  {
    from: "../node_modules/node-notifier/vendor/terminal-notifier.app/Contents/MacOS/terminal-notifier",
    to: "notifier/terminal-notifier",
    platform: "darwin",
  },
  {
    from: "../node_modules/node-notifier/vendor/snoreToast/snoretoast-x64.exe",
    to: "notifier/snoretoast-x64.exe",
    platform: "win32",
  },
  {
    from: "../node_modules/node-notifier/vendor/snoreToast/snoretoast-x86.exe",
    to: "notifier/snoretoast-x86.exe",
    platform: "win32",
  },
  {
    from: "../node_modules/open/xdg-open",
    to: "xdg-open",
  },
  {
    from: "../node_modules/systray2/traybin/tray_darwin_release",
    to: "traybin/tray_darwin_release",
    platform: "darwin",
  },
  {
    from: "../node_modules/systray2/traybin/tray_linux_release",
    to: "traybin/tray_linux_release",
    platform: "linux",
  },
  {
    from: "../node_modules/systray2/traybin/tray_windows_release.exe",
    to: "traybin/tray_windows_release.exe",
    platform: "win32",
  },
];

const outDir = join(__dirname, "../out");

filePaths
  .filter((path) => (path.platform ? path.platform === process.platform : true))
  .forEach((path) => {
    const sourceFile = join(__dirname, path.from);
    if (existsSync(sourceFile)) {
      const targetDir = join(
        outDir,
        path.to.substring(0, path.to.lastIndexOf("/"))
      );
      if (!existsSync(targetDir)) mkdirSync(targetDir);
      const targetFile = join(outDir, path.to);
      console.log(`Copy ${sourceFile} to ${targetFile}`);
      copyFileSync(sourceFile, targetFile);
    }
  });

if (process.platform === "win32")
  require("create-nodew-exe")({
    src: join(outDir, "system-bridge.exe"),
    dst: join(outDir, "start-system-bridge.exe"),
  });
