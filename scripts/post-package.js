const { copyFileSync, existsSync, mkdirSync } = require("fs");
const { join } = require("path");

const filePaths = [
  {
    from: "../LICENSE",
    to: "../out/LICENSE",
  },
  {
    from: "../public/system-bridge-circle.png",
    to: "../out/system-bridge-circle.png",
  },
  {
    from: "../node_modules/node-notifier/vendor/notifu/notifu.exe",
    to: "../out/notifier/notifu.exe",
    platform: "win32",
  },
  {
    from: "../node_modules/node-notifier/vendor/notifu/notifu64.exe",
    to: "../out/notifier/notifu64.exe",
    platform: "win32",
  },
  {
    from: "../node_modules/node-notifier/vendor/terminal-notifier.app/Contents/MacOS/terminal-notifier",
    to: "../out/notifier/terminal-notifier",
    platform: "darwin",
  },
  {
    from: "../node_modules/node-notifier/vendor/snoreToast/snoretoast-x64.exe",
    to: "../out/notifier/snoretoast-x64.exe",
    platform: "win32",
  },
  {
    from: "../node_modules/node-notifier/vendor/snoreToast/snoretoast-x86.exe",
    to: "../out/notifier/snoretoast-x86.exe",
    platform: "win32",
  },
  {
    from: "../node_modules/open/xdg-open",
    to: "../out/xdg-open",
  },
  {
    from: "../node_modules/systray2/traybin/tray_darwin_release",
    to: "../out/traybin/tray_darwin_release",
    platform: "darwin",
  },
  {
    from: "../node_modules/systray2/traybin/tray_linux_release",
    to: "../out/traybin/tray_linux_release",
    platform: "linux",
  },
  {
    from: "../node_modules/systray2/traybin/tray_windows_release.exe",
    to: "../out/traybin/tray_windows_release.exe",
    platform: "win32",
  },
];

filePaths
  .filter((path) => (path.platform ? path.platform === process.platform : true))
  .forEach((path) => {
    const sourceFile = join(__dirname, path.from);
    if (existsSync(sourceFile)) {
      const targetDir = join(
        __dirname,
        path.to.substring(0, path.to.lastIndexOf("/"))
      );
      if (!existsSync(targetDir)) mkdirSync(targetDir);
      const targetFile = join(__dirname, path.to);
      console.log(`Copy ${sourceFile} to ${targetFile}`);
      copyFileSync(sourceFile, targetFile);
    }
  });

if (process.platform === "win32")
  require("create-nodew-exe")({
    src: join(__dirname, "../out/system-bridge.exe"),
    dst: join(__dirname, "../out/start-system-bridge.exe"),
  });
