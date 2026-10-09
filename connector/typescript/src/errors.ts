import { Schema } from "effect";

export class ConnectionError extends Schema.TaggedError<ConnectionError>()(
  "ConnectionError",
  { message: Schema.String, cause: Schema.optionalKey(Schema.Defect()) },
) {}

export class AuthenticationError extends Schema.TaggedError<AuthenticationError>()(
  "AuthenticationError",
  { message: Schema.String },
) {}

export class BadRequestError extends Schema.TaggedError<BadRequestError>()(
  "BadRequestError",
  {
    message: Schema.String,
    subtype: Schema.optionalKey(Schema.String),
    status: Schema.optionalKey(Schema.Int),
  },
) {}

export class NotFoundError extends Schema.TaggedError<NotFoundError>()(
  "NotFoundError",
  { message: Schema.String },
) {}

export class RequestTimeoutError extends Schema.TaggedError<RequestTimeoutError>()(
  "RequestTimeoutError",
  { event: Schema.String, timeoutMs: Schema.Finite },
) {}

export class DataMissingError extends Schema.TaggedError<DataMissingError>()(
  "DataMissingError",
  { modules: Schema.Array(Schema.String), message: Schema.String },
) {}

export class DecodeError extends Schema.TaggedError<DecodeError>()(
  "DecodeError",
  { message: Schema.String, cause: Schema.Defect() },
) {}

export type SystemBridgeError =
  | ConnectionError
  | AuthenticationError
  | BadRequestError
  | NotFoundError
  | RequestTimeoutError
  | DataMissingError
  | DecodeError;
