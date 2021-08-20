if (process.platform === "win32" && process.env.SHOW_CONSOLE !== "true")
  import("node-hide-console-window").then((nhcw) => nhcw.hideConsole());
