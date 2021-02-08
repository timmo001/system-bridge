import path from "path";
import fs from "fs";
import SysTray, { ClickEvent } from "systray";

import logger from "./logger";
import app from "./app";

const port = app.get("port");
const server = app.listen(port);

process.on("unhandledRejection", (reason, p) =>
  logger.error("Unhandled Rejection at: Promise ", p, reason)
);

server.on("listening", () =>
  logger.info(
    "Feathers application started on http://%s:%d",
    app.get("host"),
    port
  )
);

const systray = new SysTray({
  menu: {
    // you should using .png icon in macOS/Linux, but .ico format in windows
    icon: fs.readFileSync(
      path.join(app.get("public"), "favicon.ico"),
      "base64"
    ),
    title: "System Bridge",
    tooltip: "System Bridge is running..",
    items: [
      {
        title: "Settings",
        tooltip: "Open settings for the application",
        checked: false,
        enabled: false,
      },
      {
        title: "Exit",
        tooltip: "Close the application",
        checked: false,
        enabled: true,
      },
    ],
  },
  debug: false,
  copyDir: true, // copy go tray binary to outside directory, useful for packing tool like pkg.
});

systray.onClick((action: ClickEvent) => {
  switch (action.seq_id) {
    case 0:
      break;
    case 1:
      systray.kill();
      break;
    default:
      break;
  }
});
