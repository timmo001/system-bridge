import { Application } from "../declarations";
import command from "./command/command.service";
import information from "./information/information.service";

export default function (app: Application): void {
  app.configure(command);
  app.configure(information);
}
