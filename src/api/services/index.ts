import { Application } from "../declarations";
import users from "./users/users.service";

export default function (app: Application): void {
  app.configure(users);
}