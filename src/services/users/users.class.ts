import { Service, NedbServiceOptions } from "feathers-nedb";
import { Application } from "../../declarations";

export class Users extends Service {
  //eslint-disable-next-line @typescript-eslint/no-unused-vars
  constructor(options: Partial<NedbServiceOptions>, _app: Application) {
    super(options);
  }
}
