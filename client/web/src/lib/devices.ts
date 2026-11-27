import { Client, NewKey } from "@timmo001/groundwork-auth/client";
import { Effect, Schema } from "effect";
import { HttpClientRequest } from "effect/http";
import { Atom } from "effect/reactivity";

import { connectionSettings } from "./atoms";
import type { ConnectionSettings } from "./connection-settings";
import { decodeBody, send } from "./backend";

/** What `POST /api/pair/code` answers. */
export const PairingCode = Schema.Struct({
  code: Schema.String,
  link: Schema.String,
  expiresAt: Schema.String,
});

export interface PairingCode extends Schema.Schema.Type<typeof PairingCode> {}

export const PushKind = Schema.Literals([
  "notifications",
  "updates",
  "activity",
]);

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

/** Makes a code for `gw-pairing`, which shows it and asks for another. */
export const makePairingOffer = (settings: ConnectionSettings) =>
  Effect.runPromise(
    send(settings, HttpClientRequest.post("/api/pair/code")).pipe(
      Effect.flatMap(decodeBody(PairingCode)),
      Effect.map(({ code, link, expiresAt }) => ({
        code,
        link,
        expires: expiresAt,
      })),
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

/**
 * A client with a key, as `GET /api/keys` lists it: never the key itself.
 * `usedInUrl` is when its key first came in a URL, where it can leak.
 */
export const KeyedClient = Schema.Struct({
  ...Client.fields,
  created: Schema.String,
  lastUsed: Schema.optionalKey(Schema.String),
  usedInUrl: Schema.optionalKey(Schema.String),
});

export interface KeyedClient extends Schema.Schema.Type<typeof KeyedClient> {}

/** Every client with a key to this computer. */
export const keyedClients = Atom.make((get) =>
  send(get(connectionSettings), HttpClientRequest.get("/api/keys")).pipe(
    Effect.flatMap(
      decodeBody(Schema.Struct({ clients: Schema.Array(KeyedClient) })),
    ),
    Effect.map(({ clients }) => clients),
  ),
);

/** Makes a key by hand, answered once with the key to copy. */
export const createKey = Atom.fn((name: string, get) =>
  send(
    get(connectionSettings),
    HttpClientRequest.post("/api/keys").pipe(
      HttpClientRequest.bodyJsonUnsafe({ name }),
    ),
  ).pipe(
    Effect.flatMap(decodeBody(NewKey)),
    Effect.tap(() => Effect.sync(() => get.refresh(keyedClients))),
  ),
);

/** Removes a client's key, so it can't connect until it's given another. */
export const removeKey = Atom.fn((id: string, get) =>
  send(
    get(connectionSettings),
    HttpClientRequest.delete("/api/keys").pipe(
      HttpClientRequest.setUrlParam("id", id),
    ),
  ).pipe(Effect.tap(() => Effect.sync(() => get.refresh(keyedClients)))),
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
