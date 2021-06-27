const { copyFileSync, existsSync, mkdirSync } = require("fs");
const { join } = require("path");

const filePaths = [
  {
    from: "node-notifier/vendor/notifu/notifu.exe",
    to: "notifier/notifu.exe",
  },
  {
    from: "node-notifier/vendor/notifu/notifu64.exe",
    to: "notifier/notifu64.exe",
  },
  {
    from: "node-notifier/vendor/terminal-notifier.app/Contents/MacOS/terminal-notifier",
    to: "notifier/terminal-notifier",
  },
  {
    from: "node-notifier/vendor/snoreToast/snoretoast-x64.exe",
    to: "notifier/snoretoast-x64.exe",
  },
  {
    from: "node-notifier/vendor/snoreToast/snoretoast-x86.exe",
    to: "notifier/snoretoast-x86.exe",
  },
  { from: "open/xdg-open", to: "xdg-open" },
  {
    from: "systray2/traybin/tray_darwin_release",
    to: "traybin/tray_darwin_release",
  },
  {
    from: "systray2/traybin/tray_linux_release",
    to: "traybin/tray_linux_release",
  },
  {
    from: "systray2/traybin/tray_windows_release.exe",
    to: "traybin/tray_windows_release.exe",
  },
];

const nodeModulesDir = join(__dirname, "../node_modules");
const outDir = join(__dirname, "../out");

filePaths.forEach((path) => {
  const sourceFile = join(nodeModulesDir, path.from);
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

require("create-nodew-exe")({
  src: join(
    outDir,
    `system-bridge${process.platform === "win32" ? ".exe" : ""}`
  ),
  dst: join(
    outDir,
    `start-system-bridge${process.platform === "win32" ? ".exe" : ""}`
  ),
});
