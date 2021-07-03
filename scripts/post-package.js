const { copyFileSync, existsSync, mkdirSync } = require("fs");
const { join } = require("path");

let filePaths = [
  {
    from: "../package.json",
    to: "package.json",
  },
  {
    from: "../LICENSE",
    to: "LICENSE",
  },
  {
    from: "../node_modules/node-notifier/vendor/notifu/notifu.exe",
    to: "notifier/notifu.exe",
  },
  {
    from: "../node_modules/node-notifier/vendor/notifu/notifu64.exe",
    to: "notifier/notifu64.exe",
  },
  {
    from: "../node_modules/node-notifier/vendor/terminal-notifier.app/Contents/MacOS/terminal-notifier",
    to: "notifier/terminal-notifier",
  },
  {
    from: "../node_modules/node-notifier/vendor/snoreToast/snoretoast-x64.exe",
    to: "notifier/snoretoast-x64.exe",
  },
  {
    from: "../node_modules/node-notifier/vendor/snoreToast/snoretoast-x86.exe",
    to: "notifier/snoretoast-x86.exe",
  },
  {
    from: "../node_modules/open/xdg-open",
    to: "xdg-open",
  },
  {
    from: "../node_modules/systray2/traybin/tray_darwin_release",
    to: "traybin/tray_darwin_release",
  },
  {
    from: "../node_modules/systray2/traybin/tray_linux_release",
    to: "traybin/tray_linux_release",
  },
  {
    from: "../node_modules/systray2/traybin/tray_windows_release.exe",
    to: "traybin/tray_windows_release.exe",
  },
];

const outDir = join(__dirname, "../out");

if (process.platform !== "win32")
  filePaths = filePaths.filter((path) => !path.from.includes(".exe"));

filePaths.forEach((path) => {
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
