import {
  BadRequestError,
  ConnectionError,
  ModuleName,
  SystemBridgeWebSocket,
  type DataMissingError,
  type MediaAction,
  type ModuleDataUpdate,
  type ModulesData,
  type Notification,
  type OpenTarget,
  type Settings,
  type SettingsMediaDirectory,
  type WebSocketError,
} from "@timmo001/effect-system-bridge";
import {
  type Cause,
  Context,
  Effect,
  Layer,
  Option,
  Redacted,
  Schedule,
  Stream,
  Struct,
} from "effect";
import { AsyncResult, Atom, AtomRegistry } from "effect/reactivity";

import {
  type ConnectionSettings,
  loadConnectionSettings,
  saveConnectionSettings,
} from "./connection-settings";

/** The registry every component reads its atoms from. */
export const registry = AtomRegistry.make();

const MAX_RETRIES = 3;

const RETRY_DELAY = "2 seconds";

export type BridgeError =
  WebSocketError | DataMissingError | Cause.NoSuchElementError;

type Socket = SystemBridgeWebSocket["Service"];

type ConnectionState =
  | { readonly _tag: "Connected"; readonly socket: Socket }
  | { readonly _tag: "Disconnected"; readonly error: string };

export interface ConnectionStatus {
  readonly isConnected: boolean;
  readonly error: string | null;
}

/** Turns a connector error into a message for the page. */
export function errorMessage(error: BridgeError): string {
  switch (error._tag) {
    case "AuthenticationError":
      return "Invalid API token. Please check your connection settings and update your token.";
    case "RequestTimeoutError":
      return "System Bridge didn't reply in time. Please try again.";
    default:
      return error.message;
  }
}

/** The result of an action, shaped for `renderPageResult`. */
export function actionResult<A>(
  result: AsyncResult.AsyncResult<A, BridgeError>,
  successMessage: string,
): { success: boolean; message: string } | null {
  if (result.waiting) return null;

  if (AsyncResult.isSuccess(result)) {
    return { success: true, message: successMessage };
  }

  if (!AsyncResult.isFailure(result)) return null;

  return {
    success: false,
    message: Option.match(AsyncResult.error(result), {
      onNone: () => "Something went wrong",
      onSome: errorMessage,
    }),
  };
}

/** The connection settings, saved to local storage when they change. */
export const connectionSettings = Atom.writable(
  () => loadConnectionSettings(),
  (ctx, settings: ConnectionSettings) => {
    saveConnectionSettings(settings);
    ctx.setSelf(settings);
  },
).pipe(Atom.keepAlive);

const disconnected = (error: string): ConnectionState => ({
  _tag: "Disconnected",
  error,
});

function settingsError(settings: ConnectionSettings): string | null {
  if (!settings.host || !settings.port) {
    return "Connection settings are incomplete. Please configure host and port.";
  }

  if (!settings.token) {
    return "API token is required. Please configure your token in connection settings.";
  }

  return null;
}

const bridgeLayer = (settings: ConnectionSettings, token: string) =>
  SystemBridgeWebSocket.layerGlobal({
    host: settings.host,
    port: settings.port,
    secure: settings.ssl,
    token: Redacted.make(token),
  });

/**
 * Opens the socket and checks the token with a settings request. Emits the
 * connected socket, then a disconnected state and a failure when it closes,
 * so the caller can retry.
 */
const connect = (settings: ConnectionSettings, token: string) =>
  Stream.unwrap(
    Effect.gen(function* () {
      const context = yield* Layer.build(bridgeLayer(settings, token));

      const socket = Context.get(context, SystemBridgeWebSocket);

      yield* socket.getSettings;

      const closed = Stream.fromEffect(Effect.flip(socket.closed)).pipe(
        Stream.flatMap((error) =>
          Stream.make(disconnected(error.message)).pipe(
            Stream.concat(Stream.fail(error)),
          ),
        ),
      );

      return Stream.succeed<ConnectionState>({
        _tag: "Connected",
        socket,
      }).pipe(Stream.concat(closed));
    }),
  );

/** The live connection, retried a few times before giving up. */
export const connection = Atom.make((get): Stream.Stream<ConnectionState> => {
  const settings = get(connectionSettings);
  const invalid = settingsError(settings);

  if (invalid !== null || !settings.token) {
    return Stream.make(disconnected(invalid ?? "API token is required."));
  }

  return connect(settings, settings.token).pipe(
    Stream.catchTag("AuthenticationError", (error) =>
      Stream.make(disconnected(errorMessage(error))),
    ),
    Stream.retry(
      Schedule.max([
        Schedule.spaced(RETRY_DELAY),
        Schedule.recurs(MAX_RETRIES),
      ]),
    ),
    Stream.catch((error) =>
      Stream.make(
        disconnected(
          `Failed to connect after ${MAX_RETRIES} attempts: ${errorMessage(error)}`,
        ),
      ),
    ),
  );
}).pipe(Atom.keepAlive);

export const connectionStatus = Atom.make((get): ConnectionStatus => {
  const state = AsyncResult.getOrElse(get(connection), () => undefined);

  if (state === undefined) return { isConnected: false, error: null };

  return state._tag === "Connected"
    ? { isConnected: true, error: null }
    : { isConnected: false, error: state.error };
});

/** Reconnects with the current settings. */
export function retryConnection(): void {
  registry.refresh(connection);
}

/**
 * Checks the settings can reach System Bridge and the token works, then
 * saves them, which reconnects.
 */
export const testConnection = Atom.fn(
  (input: { settings: ConnectionSettings; token: string }, get) =>
    Effect.gen(function* () {
      const bridge = yield* SystemBridgeWebSocket;

      yield* bridge.getSettings;
    }).pipe(
      Effect.provide(bridgeLayer(input.settings, input.token)),
      Effect.tap(() =>
        Effect.sync(() => get.set(connectionSettings, input.settings)),
      ),
    ),
);

const connected = (
  state: ConnectionState,
): Effect.Effect<Socket, ConnectionError> =>
  state._tag === "Connected"
    ? Effect.succeed(state.socket)
    : Effect.fail(new ConnectionError({ message: state.error }));

/** The connected socket, failing when there isn't one. */
const socket = (get: Atom.AtomContext) =>
  get.result(connection).pipe(Effect.flatMap(connected));

const fnSocket = (get: Atom.FnContext) =>
  get.result(connection).pipe(Effect.flatMap(connected));

/** Every module's data, kept up to date by the backend's data listener. */
export const moduleData = Atom.make((get) =>
  Stream.unwrap(
    Effect.gen(function* () {
      const bridge = yield* socket(get);

      const initial = yield* bridge
        .getData(ModuleName.literals)
        .pipe(
          Effect.catchTag("DataMissingError", () =>
            Effect.succeed<ModulesData>({}),
          ),
        );

      yield* bridge.registerDataListener(ModuleName.literals);

      return bridge.updates.pipe(
        Stream.scan(
          () => initial,
          (data: ModulesData, update: ModuleDataUpdate): ModulesData =>
            Struct.assign(data, { [update.module]: update.data }),
        ),
      );
    }),
  ),
).pipe(Atom.keepAlive);

/** The latest module data, kept through reconnects. */
export const latestModuleData = Atom.make((get): ModulesData =>
  AsyncResult.getOrElse(get(moduleData), () => ({})),
);

export const settings = Atom.make((get) =>
  socket(get).pipe(Effect.flatMap((bridge) => bridge.getSettings)),
).pipe(Atom.keepAlive);

export const diskMounts = Atom.make((get) =>
  socket(get).pipe(Effect.flatMap((bridge) => bridge.getDiskMounts)),
);

export const updateSettings = Atom.fn((next: Settings, get) =>
  fnSocket(get).pipe(
    Effect.flatMap((bridge) => bridge.updateSettings(next)),
    Effect.tap(() => Effect.sync(() => get.refresh(settings))),
  ),
);

/** Checks the directory exists, then adds it to the media settings. */
export const addMediaDirectory = Atom.fn(
  (directory: SettingsMediaDirectory, get) =>
    Effect.gen(function* () {
      const bridge = yield* fnSocket(get);

      if (!(yield* bridge.validateDirectory(directory.path))) {
        return yield* new BadRequestError({
          message: "Directory does not exist or is not accessible.",
        });
      }

      const current = yield* get.result(settings);

      yield* bridge.updateSettings(
        Struct.assign(current, {
          media: { directories: [...current.media.directories, directory] },
        }),
      );

      get.refresh(settings);
    }),
);

export const sendNotification = Atom.fn((notification: Notification, get) =>
  fnSocket(get).pipe(
    Effect.flatMap((bridge) => bridge.sendNotification(notification)),
  ),
);

export const open = Atom.fn((target: OpenTarget, get) =>
  fnSocket(get).pipe(Effect.flatMap((bridge) => bridge.open(target))),
);

export const mediaControl = Atom.fn((action: MediaAction, get) =>
  fnSocket(get).pipe(Effect.flatMap((bridge) => bridge.mediaControl(action))),
);

/** Runs an allowlisted command, one atom per command. */
export const executeCommand = Atom.family((commandID: string) =>
  Atom.fn((_: undefined, get) =>
    fnSocket(get).pipe(
      Effect.flatMap((bridge) => bridge.executeCommand(commandID)),
    ),
  ),
);

/**
 * The execution state of each listed command, keyed by command ID. Takes the
 * IDs joined with newlines, so the family can cache it.
 */
export const commandExecutions = Atom.family((commandIDs: string) =>
  Atom.make(
    (get) =>
      new Map(
        commandIDs
          .split("\n")
          .filter((id) => id.length > 0)
          .map((id) => [id, get(executeCommand(id))] as const),
      ),
  ),
);
