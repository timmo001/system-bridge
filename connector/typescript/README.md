# @timmo001/effect-system-bridge

An [Effect](https://effect.website) v4 connector for
[System Bridge](https://github.com/timmo001/system-bridge). It talks to the
backend over HTTP and WebSocket, with Effect schemas generated from the
backend's Go types.

## Install

```sh
bun add @timmo001/effect-system-bridge effect
```

`effect` is a peer dependency. Use the version in this package's
`peerDependencies`.

## Usage

Both services take the host, port and token from the System Bridge settings.
Keep the token in a `Redacted` so it stays out of logs.

```ts
import { Effect, Layer, Redacted, Stream } from "effect";
import {
  SystemBridgeHttp,
  SystemBridgeWebSocket,
} from "@timmo001/effect-system-bridge";

const options = {
  host: "localhost",
  port: 9170,
  token: Redacted.make(process.env.SYSTEM_BRIDGE_TOKEN ?? ""),
};

const program = Effect.gen(function* () {
  const http = yield* SystemBridgeHttp;
  const ws = yield* SystemBridgeWebSocket;

  const health = yield* http.health;
  const cpu = yield* http.getModuleData("cpu");
  const data = yield* ws.getData(["battery", "memory"]);

  yield* ws.registerDataListener(["cpu"]);

  yield* ws.updates.pipe(
    Stream.take(5),
    Stream.runForEach((update) => Effect.log(update.module, update.data)),
  );
});

program.pipe(
  Effect.provide(
    Layer.mergeAll(
      SystemBridgeHttp.layerFetch(options),
      SystemBridgeWebSocket.layerGlobal(options),
    ),
  ),
  Effect.runPromise,
);
```

- `SystemBridgeHttp.layerFetch` uses the global `fetch`. Use
  `SystemBridgeHttp.layer` to provide your own `HttpClient`.
- `SystemBridgeWebSocket.layerGlobal` uses the global `WebSocket`. Use
  `SystemBridgeWebSocket.layer` to provide your own `WebSocketConstructor`.
  The socket closes when the layer's scope ends.

Failures are tagged errors: `ConnectionError`, `AuthenticationError`,
`BadRequestError`, `NotFoundError`, `RequestTimeoutError`, `DataMissingError`
and `DecodeError`.

## Releases

The connector is released to npm and JSR with each stable System Bridge
release, using the same version as the release tag.
