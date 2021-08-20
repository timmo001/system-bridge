if (process.platform === "win32" && process.env.SB_SHOW_CONSOLE !== "true")
  import("node-hide-console-window").then((nhcw) => nhcw.hideConsole());
