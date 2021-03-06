const { copyFileSync, existsSync, mkdirSync, unlinkSync } = require("fs");
const { exec } = require("pkg");
const { join } = require("path");

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
    platform: "darwin",
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
    from: "../tray/node_modules/systray2/traybin/tray_darwin_release",
    to: "../out/traybin/tray_darwin_release",
    platform: "darwin",
  },
  {
    from: "../tray/node_modules/systray2/traybin/tray_linux_release",
    to: "../out/traybin/tray_linux_release",
    platform: "linux",
  },
  {
    from: "../tray/node_modules/systray2/traybin/tray_windows_release.exe",
    to: "../out/traybin/tray_windows_release.exe",
    platform: "win32",
  },
];

async function package() {
  await exec([
    join(__dirname, "../"),
    "--output",
    join(
      __dirname,
      `../out/system-bridge${process.platform === "win32" ? ".exe" : ""}`
    ),
  ]);

  await exec([
    join(__dirname, "../tray"),
    "--output",
    join(
      __dirname,
      `../out/system-bridge-tray${process.platform === "win32" ? ".exe" : ""}`
    ),
  ]);

  filePaths
    .filter((path) =>
      path.platform ? path.platform === process.platform : true
    )
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
}

package();
