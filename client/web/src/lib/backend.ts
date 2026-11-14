import { Effect, Schema } from "effect";
import {
  FetchHttpClient,
  HttpClient,
  HttpClientRequest,
  HttpClientResponse,
} from "effect/http";

import type { ConnectionSettings } from "./connection-settings";

/** Why a request to one of the backend's HTTP routes failed, for the page. */
export class BackendError extends Schema.TaggedError<BackendError>()(
  "BackendError",
  { message: Schema.String },
) {}

/** The backend's address, which serves the routes. */
export const baseUrl = (settings: ConnectionSettings) =>
  `${settings.ssl ? "https" : "http"}://${settings.host}:${settings.port}`;

/** Sends a request to the backend with the token, failing on an error status. */
export const send = Effect.fnUntraced(
  function* (
    settings: ConnectionSettings,
    request: HttpClientRequest.HttpClientRequest,
  ) {
    const client = yield* HttpClient.HttpClient;

    const response = yield* client.execute(
      request.pipe(
        HttpClientRequest.prependUrl(baseUrl(settings)),
        HttpClientRequest.setHeader("X-API-Token", settings.token ?? ""),
      ),
    );

    if (response.status >= 400) {
      const body = yield* HttpClientResponse.schemaBodyJson(
        Schema.Struct({ error: Schema.String }),
      )(response).pipe(Effect.orElseSucceed(() => undefined));

      return yield* new BackendError({
        message: body?.error ?? `System Bridge answered ${response.status}`,
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
