import { Application as ExpressFeathers } from "@feathersjs/express";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { Service } from "@feathersjs/feathers";
import "@feathersjs/transport-commons";

// A mapping of service names to types. Will be extended in service files.
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface ServiceTypes {}
// The application instance type that will be used everywhere else
export type Application = ExpressFeathers<ServiceTypes>;
