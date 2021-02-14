/* eslint-disable @typescript-eslint/explicit-module-boundary-types, @typescript-eslint/no-unused-vars, @typescript-eslint/no-empty-function */
import { Id, NullableId, Params, ServiceMethods } from "@feathersjs/feathers";
import execa from "execa";

import { Application } from "../../declarations";
import logger from "../../logger";

interface Data {
  command: string;
  arguments: string[];
  success?: boolean;
  message?: string;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface ServiceOptions {}

export class Command implements ServiceMethods<Data | void> {
  app: Application;
  options: ServiceOptions;

  constructor(options: ServiceOptions = {}, app: Application) {
    this.options = options;
    this.app = app;
  }

  async find(_params: Params) {
    return [];
  }

  async get(_id: Id, _params: Params): Promise<Data | void> {}

  async create(data: Data): Promise<Data | void> {
    const { stdout, stderr } = await execa(data.command, data.arguments);
    logger.debug({ stdout, stderr });
    return {
      ...data,
      success: stderr ? false : true,
      message: stdout,
    };
  }

  async update(
    _id: NullableId,
    _data: Data,
    _params: Params
  ): Promise<Data | void> {}

  async patch(
    _id: NullableId,
    _data: Data,
    _params: Params
  ): Promise<Data | void> {}

  async remove(_id: NullableId, _params: Params): Promise<Data | void> {}
}
