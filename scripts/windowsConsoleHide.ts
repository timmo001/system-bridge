if (process.platform === "win32")
  import("node-hide-console-window").then((nhcw) => nhcw.hideConsole());
