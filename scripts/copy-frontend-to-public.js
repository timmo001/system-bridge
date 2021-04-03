const fs = require("fs");
const path = require("path");

fs.renameSync(
  path.resolve(__dirname, "../frontend/build"),
  path.resolve(__dirname, "../public/frontend")
);
fs.writeFileSync(path.resolve(__dirname, "../public/frontend/.gitkeep"), "");
