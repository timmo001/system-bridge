import { Effect, identity, Schema } from "effect";
import {
  FetchHttpClient,
  HttpClient,
  HttpClientRequest,
  HttpClientResponse,
} from "effect/http";

import {
  type KeyExchangeRequest,
  keyRoutes,
  NewKey,
} from "@timmo001/groundwork-auth/client";
import { versionMismatchStatus } from "@timmo001/groundwork-pwa/update";

import type { ConnectionSettings } from "./connection-settings";
import { update } from "./update";
import { browserClientId, browserName } from "./utils";

/** Why a request to one of the backend's HTTP routes failed, for the page. */
export class BackendError extends Schema.TaggedError<BackendError>()(
  "BackendError",
  { message: Schema.String },
) {}

/** The backend's address, which serves the routes. */
export const baseUrl = (settings: ConnectionSettings) =>
  `${settings.ssl ? "https" : "http"}://${settings.host}:${settings.port}`;

/** Sends a request to the backend with the key, failing on an error status. */
export const send = Effect.fnUntraced(
  function* (
    settings: ConnectionSettings,
    request: HttpClientRequest.HttpClientRequest,
  ) {
    const client = yield* HttpClient.HttpClient;

    // Only the backend that served the page holds it to its version, not
    // another computer it's connected to
    const sameBackend = baseUrl(settings) === location.origin;

    const response = yield* client.execute(
      request.pipe(
        HttpClientRequest.prependUrl(baseUrl(settings)),
        HttpClientRequest.bearerToken(settings.token ?? ""),
        sameBackend ? HttpClientRequest.setHeaders(update.headers) : identity,
      ),
    );

    if (response.status === versionMismatchStatus) update.mismatched();

    if (response.status >= 400) {
      // A 426 says why in `message`, as Groundwork's version contract has it
      const body = yield* HttpClientResponse.schemaBodyJson(
        Schema.Struct({
          error: Schema.optional(Schema.String),
          message: Schema.optional(Schema.String),
        }),
      )(response).pipe(Effect.orElseSucceed(() => undefined));

      return yield* new BackendError({
        message:
          body?.error ??
          body?.message ??
          `System Bridge answered ${response.status}`,
      });
    }

    return response;
  },
  Effect.provide(FetchHttpClient.layer),
  // The trace headers aren't in the routes' allowed headers, so a page on
  // another origin, such as the dev server, would fail the preflight
  Effect.provideService(HttpClient.TracerPropagationEnabled, false),
  Effect.catchTags({
    HttpClientError: (error) =>
      Effect.fail(new BackendError({ message: error.message })),
  }),
);

/** Decodes a response's JSON body, failing in words the page can show. */
export const decodeBody =
  <S extends Schema.Constraint>(schema: S) =>
  (response: HttpClientResponse.HttpClientResponse) =>
    HttpClientResponse.schemaBodyJson(schema)(response).pipe(
      Effect.mapError(
        () =>
          new BackendError({
            message: "System Bridge answered in a way this page doesn't know",
          }),
      ),
    );

/** Whether a token is already a client's own key, not the old shared token. */
export const isClientKey = (token: string) =>
  token.startsWith("system-bridge_");

/**
 * Whether a token is the old shared token for the page to trade in. In the
 * Android app the app trades it for the phone's own key, so the page uses
 * what it's given.
 */
export const needsExchange = (token: string) =>
  !isClientKey(token) && globalThis.groundworkShell === undefined;

/**
 * Trades the old shared token for this browser's own key, which the page
 * keeps instead. Anything else is returned as it is.
 */
export const ownKey = (settings: ConnectionSettings, token: string) =>
  !needsExchange(token)
    ? Effect.succeed(token)
    : send(
        { ...settings, token },
        HttpClientRequest.post(`/api/${keyRoutes.exchange}`).pipe(
          HttpClientRequest.bodyJsonUnsafe({
            client: { id: browserClientId(), name: browserName(), kind: "web" },
          } satisfies KeyExchangeRequest),
        ),
      ).pipe(
        Effect.flatMap(decodeBody(NewKey)),
        Effect.map(({ key }) => key),
      );
