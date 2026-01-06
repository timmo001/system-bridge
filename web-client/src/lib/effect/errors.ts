/**
 * Typed error classes for WebSocket operations.
 *
 * Each error has a `_tag` discriminant for pattern matching with Effect.
 */

/**
 * Network or connection-level failure.
 */
export class ConnectionError {
  readonly _tag = "ConnectionError";
  message: string;
  code?: number;

  constructor(message: string, code?: number) {
    this.message = message;
    this.code = code;
  }
}

/**
 * Authentication failure - invalid or missing token.
 */
export class TokenError {
  readonly _tag = "TokenError";
  message: string;

  constructor(message: string) {
    this.message = message;
  }
}

/**
 * Operation timed out.
 */
export class TimeoutError {
  readonly _tag = "TimeoutError";
  operation: string;

  constructor(operation: string) {
    this.operation = operation;
  }
}

/**
 * Schema or data validation failure.
 */
export class ValidationError {
  readonly _tag = "ValidationError";
  message: string;
  details?: unknown;

  constructor(message: string, details?: unknown) {
    this.message = message;
    this.details = details;
  }
}

/**
 * Union type of all WebSocket-related errors.
 */
export type WebSocketError =
  | ConnectionError
  | TokenError
  | TimeoutError
  | ValidationError;
