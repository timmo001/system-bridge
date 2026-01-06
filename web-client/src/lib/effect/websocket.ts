/**
 * Effect-based WebSocket utilities.
 *
 * Provides typed, composable functions for WebSocket connection management
 * with automatic retry, timeout, and cleanup handling.
 */

import { type Scope, Duration, Effect, Schedule } from "effect";

import type { ConnectionSettings } from "~/contexts/connection";

import {
  ConnectionError,
  TimeoutError,
  TokenError,
  type WebSocketError,
} from "./errors";

// Re-export ConnectionSettings for convenience
export type { ConnectionSettings };

/**
 * Creates a WebSocket connection as an Effect.
 *
 * The returned Effect will:
 * - Succeed with the WebSocket once the connection opens
 * - Fail with ConnectionError if the connection fails
 * - Clean up properly if interrupted during connection
 *
 * @param url - The WebSocket URL to connect to
 * @returns Effect that resolves to a connected WebSocket
 */
export function createWebSocket(
  url: string,
): Effect.Effect<WebSocket, ConnectionError> {
  return Effect.async<WebSocket, ConnectionError>((resume) => {
    const ws = new WebSocket(url);

    function onOpen(): void {
      cleanup();
      resume(Effect.succeed(ws));
    }

    function onError(): void {
      cleanup();
      resume(Effect.fail(new ConnectionError("Failed to connect")));
    }

    function cleanup(): void {
      ws.removeEventListener("open", onOpen);
      ws.removeEventListener("error", onError);
    }

    ws.addEventListener("open", onOpen);
    ws.addEventListener("error", onError);

    // Return cleanup function for interruption
    return Effect.sync(() => {
      cleanup();
      if (ws.readyState === WebSocket.CONNECTING) {
        ws.close();
      }
    });
  });
}

/**
 * Connects to WebSocket with validation and timeout.
 *
 * Validates connection settings before attempting connection,
 * and applies a timeout to prevent hanging connections.
 *
 * @param settings - Connection settings including host, port, ssl, and token
 * @returns Effect that resolves to a connected WebSocket
 */
export function connect(
  settings: ConnectionSettings,
): Effect.Effect<WebSocket, WebSocketError> {
  return Effect.gen(function* () {
    const { host, port, ssl, token } = settings;

    if (!host || !port) {
      return yield* Effect.fail(
        new ConnectionError("Connection settings incomplete"),
      );
    }

    if (!token) {
      return yield* Effect.fail(new TokenError("API token required"));
    }

    const url = `${ssl ? "wss" : "ws"}://${host}:${port}/api/websocket`;
    const ws = yield* createWebSocket(url);

    return ws;
  }).pipe(
    Effect.timeout(Duration.seconds(10)),
    Effect.catchTag("TimeoutException", () =>
      Effect.fail(new TimeoutError("connection")),
    ),
    Effect.uninterruptible,
  );
}

/**
 * Connects with automatic retry using exponential backoff.
 *
 * Will retry up to `maxRetries` times with exponential delay between attempts.
 * Useful for handling transient network failures.
 *
 * @param settings - Connection settings
 * @param maxRetries - Maximum number of retry attempts (default: 3)
 * @param baseDelay - Initial delay between retries (default: 2 seconds)
 * @returns Effect that resolves to a connected WebSocket
 */
export function connectWithRetry(
  settings: ConnectionSettings,
  maxRetries = 3,
  baseDelay: Duration.Duration = Duration.seconds(2),
): Effect.Effect<WebSocket, WebSocketError> {
  return connect(settings).pipe(
    Effect.retry(
      Schedule.exponential(baseDelay).pipe(
        Schedule.intersect(Schedule.recurs(maxRetries)),
        Schedule.tapOutput(([duration]: [Duration.Duration, number]) =>
          Effect.log(`Retrying connection in ${Duration.toMillis(duration)}ms`),
        ),
      ),
    ),
  );
}

/**
 * Creates a scoped WebSocket resource with automatic cleanup.
 *
 * The WebSocket will be automatically closed when the scope ends,
 * ensuring no resource leaks even on errors or interruption.
 *
 * @param settings - Connection settings
 * @returns Scoped Effect that provides a connected WebSocket
 */
export function acquireWebSocket(
  settings: ConnectionSettings,
): Effect.Effect<WebSocket, WebSocketError, Scope.Scope> {
  return Effect.acquireRelease(connect(settings), (ws) =>
    Effect.sync(() => {
      if (
        ws.readyState === WebSocket.OPEN ||
        ws.readyState === WebSocket.CONNECTING
      ) {
        ws.close();
      }
    }),
  );
}
