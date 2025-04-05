import { z } from "zod";

import { ModuleNameSchema } from "~/lib/system-bridge/types-modules";

export const EventTypeSchema = z.enum([
  "EXIT_APPLICATION",
  "GET_DATA",
  "GET_DIRECTORIES",
  "GET_DIRECTORY",
  "GET_FILES",
  "GET_FILE",
  "GET_SETTINGS",
  "KEYBOARD_KEYPRESS",
  "KEYBOARD_TEXT",
  "MEDIA_CONTROL",
  "NOTIFICATION",
  "OPEN",
  "POWER_HIBERNATE",
  "POWER_LOCK",
  "POWER_LOGOUT",
  "POWER_RESTART",
  "POWER_SHUTDOWN",
  "POWER_SLEEP",
  "REGISTER_DATA_LISTENER",
  "UNREGISTER_DATA_LISTENER",
  "DATA_UPDATE",
  "UPDATE_SETTINGS",
]);

export type EventType = z.infer<typeof EventTypeSchema>;

export const ResponseTypeSchema = z.enum([
  "ERROR",
  "APPLICATION_EXITING",
  "DATA_GET",
  "DIRECTORIES",
  "DIRECTORY",
  "FILES",
  "FILE",
  "KEYBOARD_KEY_PRESSED",
  "KEYBOARD_TEXT_SENT",
  "MEDIA_CONTROLLED",
  "NOTIFICATION_SENT",
  "OPENED",
  "POWER_HIBERNATING",
  "POWER_LOCKING",
  "POWER_LOGGINGOUT",
  "POWER_RESTARTING",
  "POWER_SHUTTINGDOWN",
  "POWER_SLEEPING",
  "DATA_LISTENER_REGISTERED",
  "DATA_LISTENER_UNREGISTERED",
  "DATA_UPDATE",
  "SETTINGS_RESULT",
  "SETTINGS_UPDATED",
]);

export type ResponseType = z.infer<typeof ResponseTypeSchema>;

export const ResponseSubtypeSchema = z.enum([
  "NONE",
  "BAD_REQUEST",
  "BAD_TOKEN",
  "BAD_JSON",
  "BAD_DIRECTORY",
  "BAD_FILE",
  "BAD_PATH",
  "INVALID_ACTION",
  "LISTENER_ALREADY_REGISTERED",
  "LISTENER_NOT_REGISTERED",
  "MISSING_ACTION",
  "MISSING_BASE",
  "MISSING_KEY",
  "MISSING_MODULES",
  "MISSING_PATH",
  "MISSING_PATH_URL",
  "MISSING_SETTING",
  "MISSING_TEXT",
  "MISSING_TITLE",
  "MISSING_TOKEN",
  "MISSING_VALUE",
  "UNKNOWN_EVENT",
]);

export type ResponseSubtype = z.infer<typeof ResponseSubtypeSchema>;

export const WebSocketRequestSchema = z.object({
  id: z.string(),
  event: EventTypeSchema,
  data: z.any().default({}),
  token: z.string(),
});

export type WebSocketRequest = z.infer<typeof WebSocketRequestSchema>;

export const WebSocketResponseSchema = z.object({
  id: z.string(),
  type: ResponseTypeSchema,
  subtype: ResponseSubtypeSchema,
  data: z.any(),
  message: z.string().optional(),
  module: ModuleNameSchema.optional(),
});

export type MessageResponse = z.infer<typeof WebSocketResponseSchema>;
