import { Effect, Schema } from "effect";
import {
  FetchHttpClient,
  HttpClient,
  HttpClientRequest,
  HttpClientResponse,
} from "effect/http";
import { Atom } from "effect/reactivity";

import { connectionSettings } from "./atoms";
import type { ConnectionSettings } from "./connection-settings";

/** Why a request to the pairing or push routes failed, for the page. */
export class DevicesError extends Schema.TaggedError<DevicesError>()(
  "DevicesError",
  { message: Schema.String },
) {}

/** What `POST /api/pair/code` answers. */
export const PairingCode = Schema.Struct({
  code: Schema.String,
  link: Schema.String,
  expiresAt: Schema.String,
});

export interface PairingCode extends Schema.Schema.Type<typeof PairingCode> {}

export const PushKind = Schema.Literals(["notifications", "updates"]);

export type PushKind = Schema.Schema.Type<typeof PushKind>;

/** A phone or browser getting pushes, as the list shows it. */
export const PushSubscriber = Schema.Struct({
  client: Schema.Struct({
    id: Schema.String,
    name: Schema.String,
    platform: Schema.String,
  }),
  kinds: Schema.Array(PushKind),
  created: Schema.String,
  endpointHost: Schema.String,
});

export interface PushSubscriber extends Schema.Schema.Type<
  typeof PushSubscriber
> {}

/** The backend's address, which serves the routes. */
export const baseUrl = (settings: ConnectionSettings) =>
  `${settings.ssl ? "https" : "http"}://${settings.host}:${settings.port}`;

/** Sends a request to the backend with the token, failing on an error status. */
const send = Effect.fnUntraced(
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

      return yield* new DevicesError({
        message: body?.error ?? `System Bridge answered ${response.status}`,
      });
    }

    return response;
  },
  Effect.provide(FetchHttpClient.layer),
  Effect.catchTags({
    HttpClientError: (error) =>
      Effect.fail(new DevicesError({ message: error.message })),
  }),
);

const decodeBody =
  <S extends Schema.Constraint>(schema: S) =>
  (response: HttpClientResponse.HttpClientResponse) =>
    HttpClientResponse.schemaBodyJson(schema)(response).pipe(
      Effect.mapError(
        () =>
          new DevicesError({
            message: "System Bridge answered in a way this page doesn't know",
          }),
      ),
    );

/** Makes a one-time pairing code, for the QR code. */
export const pairingCode = Atom.fn((_: undefined, get) =>
  send(get(connectionSettings), HttpClientRequest.post("/api/pair/code")).pipe(
    Effect.flatMap(decodeBody(PairingCode)),
  ),
);

/** The devices, phones and browsers, getting pushes from this computer. */
export const pushSubscribers = Atom.make((get) =>
  send(
    get(connectionSettings),
    HttpClientRequest.get("/api/push/subscriptions"),
  ).pipe(Effect.flatMap(decodeBody(Schema.Array(PushSubscriber)))),
);

/** Stops pushes to a phone or browser in the list. */
export const removePushSubscriber = Atom.fn((clientId: string, get) =>
  send(
    get(connectionSettings),
    HttpClientRequest.delete("/api/push/subscriptions").pipe(
      HttpClientRequest.bodyJsonUnsafe({ clientId }),
    ),
  ).pipe(Effect.tap(() => Effect.sync(() => get.refresh(pushSubscribers)))),
);

/** Sets which kinds of push a client gets. */
export const setPushKinds = Atom.fn(
  (input: { clientId: string; kinds: readonly PushKind[] }, get) =>
    send(
      get(connectionSettings),
      HttpClientRequest.post("/api/push/preferences").pipe(
        HttpClientRequest.bodyJsonUnsafe(input),
      ),
    ).pipe(Effect.tap(() => Effect.sync(() => get.refresh(pushSubscribers)))),
);
