import { Application } from "../declarations";
import command from "./command/command.service";
import users from "./users/users.service";

export default function (app: Application): void {
  app.configure(command);
  app.configure(users);
}
