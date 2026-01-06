/**
 * Effect runtime utilities for Lit integration.
 *
 * Provides functions to bridge Effect with Lit component lifecycle,
 * including Promise conversion and AbortSignal support.
 */

import { type Effect as EffectType, Cause, Exit, Fiber, Runtime } from "effect";

const runtime = Runtime.defaultRuntime;

/**
 * Run an Effect and return a Promise.
 *
 * @param effect - The Effect to run
 * @returns Promise that resolves with the Effect result
 */
export function runPromise<A, E>(effect: EffectType.Effect<A, E>): Promise<A> {
  return Runtime.runPromise(runtime)(effect);
}

/**
 * Run an Effect, returning a Fiber for later control.
 *
 * Use this when you need to interrupt the Effect later.
 *
 * @param effect - The Effect to run
 * @returns Fiber that can be awaited or interrupted
 */
export function runFork<A, E>(
  effect: EffectType.Effect<A, E>,
): Fiber.RuntimeFiber<A, E> {
  return Runtime.runFork(runtime)(effect);
}

/**
 * Run an Effect with AbortSignal support for cancellation.
 *
 * The Effect will be interrupted when the signal is aborted,
 * making it easy to integrate with Lit component lifecycle.
 *
 * @param effect - The Effect to run
 * @param signal - AbortSignal to trigger cancellation
 * @returns Promise that resolves with the Effect result or rejects on abort
 */
export function runWithSignal<A, E>(
  effect: EffectType.Effect<A, E>,
  signal: AbortSignal,
): Promise<A> {
  return new Promise((resolve, reject) => {
    const fiber = runFork(effect);

    function abortHandler(): void {
      void Runtime.runPromise(runtime)(Fiber.interrupt(fiber));
    }

    signal.addEventListener("abort", abortHandler, { once: true });

    void Runtime.runPromise(runtime)(Fiber.await(fiber)).then((exit) => {
      signal.removeEventListener("abort", abortHandler);
      Exit.match(exit, {
        onSuccess: resolve,
        onFailure: (cause) => {
          if (Cause.isInterruptedOnly(cause)) {
            reject(new Error("Aborted"));
          } else {
            const squashed = Cause.squash(cause);
            reject(
              squashed instanceof Error
                ? squashed
                : new Error(String(squashed)),
            );
          }
        },
      });
    });
  });
}

/**
 * Error handler map for WebSocket errors.
 */
export interface ErrorHandlers<A> {
  // eslint-disable-next-line @typescript-eslint/naming-convention
  ConnectionError?: (e: { message: string; code?: number }) => A;
  // eslint-disable-next-line @typescript-eslint/naming-convention
  TokenError?: (e: { message: string }) => A;
  // eslint-disable-next-line @typescript-eslint/naming-convention
  TimeoutError?: (e: { operation: string }) => A;
  // eslint-disable-next-line @typescript-eslint/naming-convention
  ValidationError?: (e: { message: string; details?: unknown }) => A;
  // eslint-disable-next-line @typescript-eslint/naming-convention
  Unknown?: (e: unknown) => A;
}

/**
 * Pattern match on WebSocket errors for error handling.
 *
 * Inspects the `_tag` property of the error and calls the appropriate handler.
 *
 * @param error - The error to match
 * @param handlers - Object with handler functions for each error type
 * @returns Result from the matched handler, or undefined if no match
 *
 * @example
 * ```ts
 * matchError(error, {
 *   ConnectionError: (e) => `Connection failed: ${e.message}`,
 *   TokenError: (e) => `Auth failed: ${e.message}`,
 *   TimeoutError: (e) => `${e.operation} timed out`,
 *   Unknown: (e) => `Unknown error: ${String(e)}`,
 * });
 * ```
 */
export function matchError<A>(
  error: unknown,
  handlers: ErrorHandlers<A>,
): A | undefined {
  if (typeof error === "object" && error !== null && "_tag" in error) {
    const tag = (error as { _tag: string })._tag;
    const handler = handlers[tag as keyof typeof handlers];
    if (handler) {
      return handler(error as never);
    }
  }
  return handlers.Unknown?.(error);
}
