import type { ConnectionSettings } from "~/contexts/connection";

type RequestEvent = CustomEvent<{ requestId: string; timestamp: number }>;

type RequestErrorEvent = CustomEvent<{
  requestId: string;
  message: string;
  timestamp: number;
}>;

declare global {
  interface WindowEventMap {
    "notification-sent": RequestEvent;
    "notification-error": RequestErrorEvent;
    "open-success": RequestEvent;
    "open-error": RequestErrorEvent;
    "media-control-success": RequestEvent;
    "media-control-error": RequestErrorEvent;
    "settings-updated": RequestEvent;
    "settings-update-error": RequestErrorEvent;
  }

  interface HTMLElementEventMap {
    "connection-updated": CustomEvent<ConnectionSettings>;
  }
}
