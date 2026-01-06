import { Effect, Either, type ParseResult, Schema } from "effect";

import { ValidationError } from "./errors";

/**
 * Parse with Effect Schema, returning an Effect.
 */
export function decodeWithSchema<A, I>(
  schema: Schema.Schema<A, I>,
  data: unknown,
  context?: string,
): Effect.Effect<A, ValidationError> {
  return Effect.try({
    try: () => Schema.decodeUnknownSync(schema)(data),
    catch: (error) =>
      new ValidationError(
        context ? `${context}: validation failed` : "Validation failed",
        error,
      ),
  });
}

/**
 * Parse JSON string to unknown.
 */
export function parseJSON(
  rawData: string,
): Effect.Effect<unknown, ValidationError> {
  return Effect.try({
    try: () => JSON.parse(rawData) as unknown,
    catch: () => new ValidationError("Failed to parse JSON message"),
  });
}

/**
 * Combined parse and decode.
 */
export function parseAndDecode<A, I>(
  schema: Schema.Schema<A, I>,
  rawData: string,
  context?: string,
): Effect.Effect<A, ValidationError> {
  return Effect.flatMap(parseJSON(rawData), (data) =>
    decodeWithSchema(schema, data, context),
  );
}

/**
 * Synchronously decode unknown data with Effect Schema.
 * Returns Either for synchronous error handling.
 */
export function decodeUnknownEither<A, I>(
  schema: Schema.Schema<A, I>,
  data: unknown,
): Either.Either<A, ParseResult.ParseError> {
  return Schema.decodeUnknownEither(schema)(data);
}

/**
 * Synchronous safe parse that returns a result object similar to Zod's safeParse.
 * Useful for migrating from Zod patterns.
 */
export function safeParse<A, I>(
  schema: Schema.Schema<A, I>,
  data: unknown,
):
  | { success: true; data: A }
  | { success: false; error: ParseResult.ParseError } {
  const result = Schema.decodeUnknownEither(schema)(data);
  if (Either.isRight(result)) {
    return { success: true, data: result.right };
  }
  return { success: false, error: result.left };
}
