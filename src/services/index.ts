import { Application } from "../declarations";
import system from "./system/system.service";

export default function (app: Application): void {
  app.configure(system);
}
