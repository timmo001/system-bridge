import NeDB from "nedb";
import path from "path";

import { Application } from "../declarations";

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export default function (app: Application) {
  const Model = new NeDB({
    filename: path.join(app.get("nedb"), "keys.db"),
    autoload: true,
  });

  Model.ensureIndex({ fieldName: "key", unique: true });

  return Model;
}
