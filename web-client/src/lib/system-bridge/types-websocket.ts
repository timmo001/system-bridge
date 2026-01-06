import { Schema } from "effect";

import { ModuleNameSchema } from "~/lib/system-bridge/types-modules";

export const EventTypeSchema = Schema.Union(
  Schema.Literal("COMMAND_EXECUTE"),
  Schema.Literal("EXIT_APPLICATION"),
  Schema.Literal("GET_DATA"),
  Schema.Literal("GET_DIRECTORIES"),
  Schema.Literal("GET_DIRECTORY"),
  Schema.Literal("GET_FILES"),
  Schema.Literal("GET_FILE"),
  Schema.Literal("GET_SETTINGS"),
  Schema.Literal("KEYBOARD_KEYPRESS"),
  Schema.Literal("KEYBOARD_TEXT"),
  Schema.Literal("MEDIA_CONTROL"),
  Schema.Literal("NOTIFICATION"),
  Schema.Literal("OPEN"),
  Schema.Literal("POWER_HIBERNATE"),
  Schema.Literal("POWER_LOCK"),
  Schema.Literal("POWER_LOGOUT"),
  Schema.Literal("POWER_RESTART"),
  Schema.Literal("POWER_SHUTDOWN"),
  Schema.Literal("POWER_SLEEP"),
  Schema.Literal("REGISTER_DATA_LISTENER"),
  Schema.Literal("UNREGISTER_DATA_LISTENER"),
  Schema.Literal("DATA_UPDATE"),
  Schema.Literal("UPDATE_SETTINGS"),
  Schema.Literal("VALIDATE_DIRECTORY"),
);

export type EventType = typeof EventTypeSchema.Type;

export const ResponseTypeSchema = Schema.Union(
  Schema.Literal("ERROR"),
  Schema.Literal("APPLICATION_EXITING"),
  Schema.Literal("COMMAND_EXECUTING"),
  Schema.Literal("COMMAND_COMPLETED"),
  Schema.Literal("DATA_GET"),
  Schema.Literal("DIRECTORIES"),
  Schema.Literal("DIRECTORY"),
  Schema.Literal("FILES"),
  Schema.Literal("FILE"),
  Schema.Literal("KEYBOARD_KEY_PRESSED"),
  Schema.Literal("KEYBOARD_TEXT_SENT"),
  Schema.Literal("MEDIA_CONTROLLED"),
  Schema.Literal("NOTIFICATION_SENT"),
  Schema.Literal("OPENED"),
  Schema.Literal("POWER_HIBERNATING"),
  Schema.Literal("POWER_LOCKING"),
  Schema.Literal("POWER_LOGGINGOUT"),
  Schema.Literal("POWER_RESTARTING"),
  Schema.Literal("POWER_SHUTTINGDOWN"),
  Schema.Literal("POWER_SLEEPING"),
  Schema.Literal("DATA_LISTENER_REGISTERED"),
  Schema.Literal("DATA_LISTENER_UNREGISTERED"),
  Schema.Literal("DATA_UPDATE"),
  Schema.Literal("SETTINGS_RESULT"),
  Schema.Literal("SETTINGS_UPDATED"),
  Schema.Literal("DIRECTORY_VALIDATED"),
);

export type ResponseType = typeof ResponseTypeSchema.Type;

export const ResponseSubtypeSchema = Schema.Union(
  Schema.Literal("NONE"),
  Schema.Literal("BAD_REQUEST"),
  Schema.Literal("BAD_TOKEN"),
  Schema.Literal("BAD_JSON"),
  Schema.Literal("BAD_DIRECTORY"),
  Schema.Literal("BAD_FILE"),
  Schema.Literal("BAD_PATH"),
  Schema.Literal("COMMAND_NOT_FOUND"),
  Schema.Literal("INVALID_ACTION"),
  Schema.Literal("LISTENER_ALREADY_REGISTERED"),
  Schema.Literal("LISTENER_NOT_REGISTERED"),
  Schema.Literal("MISSING_ACTION"),
  Schema.Literal("MISSING_BASE"),
  Schema.Literal("MISSING_KEY"),
  Schema.Literal("MISSING_MODULES"),
  Schema.Literal("MISSING_PATH"),
  Schema.Literal("MISSING_PATH_URL"),
  Schema.Literal("MISSING_SETTING"),
  Schema.Literal("MISSING_TEXT"),
  Schema.Literal("MISSING_TITLE"),
  Schema.Literal("MISSING_TOKEN"),
  Schema.Literal("MISSING_VALUE"),
  Schema.Literal("UNKNOWN_EVENT"),
);

export type ResponseSubtype = typeof ResponseSubtypeSchema.Type;

export const WebSocketRequestSchema = Schema.Struct({
  id: Schema.String,
  event: EventTypeSchema,
  // Request data type varies by event type
  data: Schema.optional(Schema.Unknown),
  token: Schema.String,
});

export type WebSocketRequest = typeof WebSocketRequestSchema.Type;

export const WebSocketResponseSchema = Schema.Struct({
  id: Schema.String,
  type: ResponseTypeSchema,
  subtype: ResponseSubtypeSchema,
  // Data type varies by response type (module data, settings, command results, etc.)
  // Runtime validation is performed with specific schemas before use
  data: Schema.NullishOr(Schema.Unknown),
  message: Schema.optional(Schema.String),
  module: Schema.optional(ModuleNameSchema),
});

export type WebsocketResponse = typeof WebSocketResponseSchema.Type;

export const ValidateDirectoryResponseSchema = Schema.Struct({
  valid: Schema.Boolean,
});

export type ValidateDirectoryResponse =
  typeof ValidateDirectoryResponseSchema.Type;
