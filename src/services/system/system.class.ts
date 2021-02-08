import { Service, NedbServiceOptions } from "feathers-nedb";
import { Application } from "../../declarations";

export class System extends Service {
  //eslint-disable-next-line @typescript-eslint/no-unused-vars
  constructor(options: Partial<NedbServiceOptions>, _app: Application) {
    super(options);
  }
}
