import NeDB from "nedb";
import path from "path";
import { Application } from "../declarations";

export default function (app: Application): NeDB<any> {
  const dbPath = app.get("nedb");
  const Model = new NeDB({
    filename: path.join(dbPath, "users.db"),
    autoload: true,
  });

  Model.ensureIndex({ fieldName: "email", unique: true });

  return Model;
}
