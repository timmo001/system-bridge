import {
  Context,
  Deferred,
  Duration,
  Effect,
  Layer,
  Match,
  MutableHashMap,
  Option,
  Predicate,
  PubSub,
  Random,
  Redacted,
  Ref,
  Result,
  Schema,
  Stream,
} from "effect";
import * as Socket from "effect/socket/Socket";
import { websocketUrl, type ConnectionOptions } from "./connection.js";
import {
  AuthenticationError,
  BadRequestError,
  ConnectionError,
  DataMissingError,
  DecodeError,
  RequestTimeoutError,
} from "./errors.js";
import {
  DiskMountsResponse,
  ModuleDataUpdate,
  type ModuleName,
  ModulesData,
} from "./generated/modules.js";
import {
  CommandRequest,
  CommandResult,
  Directory,
  DirectoryRequest,
  DiscordControl,
  Empty,
  type EventType,
  FileInfo,
  GetFilesRequest,
  KeyboardKeypress,
  KeyboardText,
  type MediaAction,
  MediaControl,
  MediaDirectory,
  ModulesRequest,
  Notification,
  OpenTarget,
  PathRequest,
  type ResponseType,
  Settings,
  ValidateDirectoryResult,
  WebSocketResponse,
} from "./protocol.js";

export type WebSocketError =
  | ConnectionError
  | AuthenticationError
  | BadRequestError
  | RequestTimeoutError
  | DecodeError;

export interface WebSocketOptions extends ConnectionOptions {
  /** How long to wait for a reply to a request. Defaults to 8 seconds. */
  readonly requestTimeout?: Duration.Input;
  /** How long `getData` waits for every module. Defaults to 10 seconds. */
  readonly dataTimeout?: Duration.Input;
  /** How long to wait for the socket to open. Defaults to 10 seconds. */
  readonly openTimeout?: Duration.Input;
}

export type PowerAction =
  "hibernate" | "lock" | "logout" | "restart" | "shutdown" | "sleep";

export interface Interface {
  /** Module data pushed by the backend after `registerDataListener`. */
  readonly updates: Stream.Stream<ModuleDataUpdate>;
  /** Fails with a `ConnectionError` once the socket stops. */
  readonly closed: Effect.Effect<never, ConnectionError>;
  readonly getData: (
    modules: ReadonlyArray<ModuleName>,
  ) => Effect.Effect<ModulesData, WebSocketError | DataMissingError>;
  readonly registerDataListener: (
    modules: ReadonlyArray<ModuleName>,
  ) => Effect.Effect<void, WebSocketError>;
  readonly unregisterDataListener: Effect.Effect<void, WebSocketError>;
  readonly getDirectories: Effect.Effect<
    ReadonlyArray<MediaDirectory>,
    WebSocketError
  >;
  readonly getDirectory: (
    base: string,
  ) => Effect.Effect<Directory, WebSocketError>;
  readonly getFiles: (
    request: GetFilesRequest,
  ) => Effect.Effect<ReadonlyArray<FileInfo>, WebSocketError>;
  readonly getFile: (path: string) => Effect.Effect<FileInfo, WebSocketError>;
  readonly getDiskMounts: Effect.Effect<DiskMountsResponse, WebSocketError>;
  readonly getSettings: Effect.Effect<Settings, WebSocketError>;
  readonly updateSettings: (
    settings: Settings,
  ) => Effect.Effect<Settings, WebSocketError>;
  readonly validateDirectory: (
    path: string,
  ) => Effect.Effect<boolean, WebSocketError>;
  /** Runs an allowlisted command and waits for it to finish. */
  readonly executeCommand: (
    commandID: string,
  ) => Effect.Effect<CommandResult, WebSocketError>;
  readonly keyboardKeypress: (
    keypress: KeyboardKeypress,
  ) => Effect.Effect<void, WebSocketError>;
  readonly keyboardText: (
    text: KeyboardText,
  ) => Effect.Effect<void, WebSocketError>;
  readonly mediaControl: (
    action: MediaAction,
  ) => Effect.Effect<void, WebSocketError>;
  readonly discordControl: (
    control: DiscordControl,
  ) => Effect.Effect<void, WebSocketError>;
  readonly sendNotification: (
    notification: Notification,
  ) => Effect.Effect<void, WebSocketError>;
  readonly open: (target: OpenTarget) => Effect.Effect<void, WebSocketError>;
  readonly power: (action: PowerAction) => Effect.Effect<void, WebSocketError>;
  /** Asks the backend to exit. Does not wait for a reply. */
  readonly exitBackend: Effect.Effect<void, WebSocketError>;
}

interface PendingRequest {
  readonly event: EventType;
  readonly expected: ResponseType;
  readonly deferred: Deferred.Deferred<WebSocketResponse, WebSocketError>;
}

const decodeResponse = Schema.decodeEffect(
  Schema.fromJsonString(WebSocketResponse),
);

const decodeUpdate = Schema.decodeUnknownEffect(ModuleDataUpdate);

const powerEvents = {
  hibernate: ["POWER_HIBERNATE", "POWER_HIBERNATING"],
  lock: ["POWER_LOCK", "POWER_LOCKING"],
  logout: ["POWER_LOGOUT", "POWER_LOGGINGOUT"],
  restart: ["POWER_RESTART", "POWER_RESTARTING"],
  shutdown: ["POWER_SHUTDOWN", "POWER_SHUTTINGDOWN"],
  sleep: ["POWER_SLEEP", "POWER_SLEEPING"],
} as const satisfies Record<PowerAction, readonly [EventType, ResponseType]>;

const errorFromResponse = (
  response: WebSocketResponse,
  event: EventType,
  timeoutMs: number,
): Option.Option<WebSocketError> => {
  const message = response.message ?? `${event} failed`;

  return Match.value(response.subtype ?? "NONE").pipe(
    Match.when("LISTENER_ALREADY_REGISTERED", () => Option.none()),
    Match.whenOr("BAD_TOKEN", "BAD_API_KEY", "MISSING_TOKEN", () =>
      Option.some(new AuthenticationError({ message })),
    ),
    Match.when("TIMEOUT", () =>
      Option.some(new RequestTimeoutError({ event, timeoutMs })),
    ),
    Match.orElse((subtype) =>
      Option.some(new BadRequestError({ message, subtype })),
    ),
  );
};

const toConnectionError = (cause: Socket.SocketError) =>
  new ConnectionError({ message: cause.message, cause });

const encodeRequest = <A, I>(
  payload: Schema.Codec<A, I>,
  message: {
    readonly token: string;
    readonly id: string;
    readonly event: EventType;
    readonly data: A;
  },
) =>
  Schema.encodeEffect(
    Schema.fromJsonString(
      Schema.Struct({
        token: Schema.String,
        id: Schema.String,
        event: Schema.String,
        data: payload,
      }),
    ),
  )(message).pipe(
    Effect.mapError(
      (cause) =>
        new DecodeError({
          message: `Invalid ${message.event} request: ${cause.message}`,
          cause,
        }),
    ),
  );

const decodeReply = <A>(
  schema: Schema.Decoder<A>,
  event: EventType,
  response: WebSocketResponse,
) =>
  Schema.decodeEffect(schema)(response.data ?? null).pipe(
    Effect.mapError(
      (cause) =>
        new DecodeError({
          message: `Invalid ${event} reply: ${cause.message}`,
          cause,
        }),
    ),
  );

const ignoreReply = Schema.Unknown;

const listOrEmpty = <A>(item: Schema.Decoder<A>) =>
  Schema.NullOr(Schema.Array(item));

export const make = Effect.fnUntraced(function* (options: WebSocketOptions) {
  const requestTimeout = Duration.fromInputUnsafe(
    options.requestTimeout ?? "8 seconds",
  );

  const dataTimeout = Duration.fromInputUnsafe(
    options.dataTimeout ?? "10 seconds",
  );

  const socket = yield* Socket.makeWebSocket(websocketUrl(options), {
    openTimeout: options.openTimeout ?? "10 seconds",
  });

  const pull = yield* Socket.readerString(socket).pipe(
    Effect.mapError(toConnectionError),
  );

  const writer = yield* socket.writer;

  const pending = MutableHashMap.empty<string, PendingRequest>();

  const responses = yield* Effect.acquireRelease(
    PubSub.unbounded<WebSocketResponse>(),
    PubSub.shutdown,
  );

  const closed = yield* Deferred.make<never, ConnectionError>();

  const prefix = (yield* Random.nextInt).toString(36);

  const counter = yield* Ref.make(0);

  const settle = (
    response: WebSocketResponse,
    request: PendingRequest,
  ): Effect.Effect<boolean> => {
    if (response.type !== "ERROR") {
      return response.type === request.expected
        ? Deferred.succeed(request.deferred, response)
        : Effect.succeed(false);
    }

    return Option.match(
      errorFromResponse(
        response,
        request.event,
        Duration.toMillis(requestTimeout),
      ),
      {
        onNone: () => Deferred.succeed(request.deferred, response),
        onSome: (error) => Deferred.fail(request.deferred, error),
      },
    );
  };

  const onResponse = Effect.fnUntraced(function* (response: WebSocketResponse) {
    if (response.type === "DATA_UPDATE") {
      yield* PubSub.publish(responses, response);

      return;
    }

    const request = Option.flatMap(Option.fromUndefinedOr(response.id), (id) =>
      MutableHashMap.get(pending, id),
    );

    if (Option.isSome(request)) {
      yield* settle(response, request.value);
    }
  });

  const readFrame = (frame: string) =>
    decodeResponse(frame).pipe(
      Effect.flatMap(onResponse),
      Effect.catch((error) =>
        Effect.logWarning(
          "Ignoring an unreadable System Bridge message",
          error.message,
        ),
      ),
    );

  const failPending = Effect.gen(function* () {
    const error = new ConnectionError({
      message: "The System Bridge connection closed",
    });

    yield* Deferred.fail(closed, error);

    yield* Effect.forEach(
      MutableHashMap.values(pending),
      (request) => Deferred.fail(request.deferred, error),
      { discard: true },
    );

    MutableHashMap.clear(pending);
  });

  yield* pull.pipe(
    Effect.mapError(toConnectionError),
    Effect.flatMap((frames) =>
      Effect.forEach(frames, readFrame, { discard: true }),
    ),
    Effect.forever,
    Effect.catch((error) => Deferred.fail(closed, error)),
    Effect.ensuring(failPending),
    Effect.forkScoped,
  );

  const nextId = Ref.getAndUpdate(counter, (n) => n + 1).pipe(
    Effect.map((n) => `${prefix}-${n}`),
  );

  const write = <A, I>(
    event: EventType,
    id: string,
    payload: Schema.Codec<A, I>,
    data: A,
  ) =>
    encodeRequest(payload, {
      token: Redacted.value(options.token),
      id,
      event,
      data,
    }).pipe(
      Effect.flatMap((frame) =>
        writer.write(frame).pipe(Effect.mapError(toConnectionError)),
      ),
    );

  /** Sends an event, waits for the reply of the expected type and decodes it. */
  const call = Effect.fnUntraced(function* <A, I, B>(
    event: EventType,
    expected: ResponseType,
    payload: Schema.Codec<A, I>,
    data: A,
    reply: Schema.Decoder<B>,
  ) {
    const id = yield* nextId;

    const deferred = yield* Deferred.make<WebSocketResponse, WebSocketError>();

    MutableHashMap.set(pending, id, { event, expected, deferred });

    const response = yield* write(event, id, payload, data).pipe(
      Effect.andThen(
        Effect.raceFirst(Deferred.await(deferred), Deferred.await(closed)),
      ),
      Effect.timeoutOrElse({
        duration: requestTimeout,
        orElse: () =>
          Effect.fail(
            new RequestTimeoutError({
              event,
              timeoutMs: Duration.toMillis(requestTimeout),
            }),
          ),
      }),
      Effect.ensuring(
        Effect.sync(() => {
          MutableHashMap.remove(pending, id);
        }),
      ),
    );

    return yield* decodeReply(reply, event, response);
  });

  const updates: Stream.Stream<ModuleDataUpdate> = Stream.fromPubSub(
    responses,
  ).pipe(
    Stream.filter((response) => Predicate.isNotNullish(response.data)),
    Stream.filterMapEffect((response) =>
      decodeUpdate({ module: response.module, data: response.data }).pipe(
        Effect.map(Result.succeed),
        Effect.catch((error) =>
          Effect.logWarning(
            `Skipping an unreadable ${response.module ?? "module"} update`,
            error.message,
          ).pipe(Effect.as(Result.fail(response))),
        ),
      ),
    ),
  );

  const collectModules = Effect.fnUntraced(function* (
    subscription: PubSub.Subscription<WebSocketResponse>,
    modules: ReadonlyArray<ModuleName>,
  ) {
    const wanted = new Set<string>(modules);

    const received = new Map<string, WebSocketResponse["data"]>();

    yield* PubSub.take(subscription).pipe(
      Effect.tap((response) =>
        Effect.sync(() => {
          if (
            Predicate.isNotUndefined(response.module) &&
            wanted.has(response.module) &&
            Predicate.isNotNullish(response.data)
          ) {
            received.set(response.module, response.data);
          }
        }),
      ),
      Effect.repeat({ until: () => received.size === wanted.size }),
      Effect.timeoutOrElse({
        duration: dataTimeout,
        orElse: () => {
          const missing = modules.filter((module) => !received.has(module));

          return Effect.fail(
            new DataMissingError({
              modules: missing,
              message: `No data received for ${missing.join(", ")}`,
            }),
          );
        },
      }),
    );

    return yield* Schema.decodeEffect(ModulesData)(
      Object.fromEntries(received),
    ).pipe(
      Effect.mapError(
        (cause) =>
          new DecodeError({
            message: `Invalid module data: ${cause.message}`,
            cause,
          }),
      ),
    );
  });

  const getData = Effect.fn("SystemBridgeWebSocket.getData")(function* (
    modules: ReadonlyArray<ModuleName>,
  ) {
    const subscription = yield* PubSub.subscribe(responses);

    yield* call(
      "GET_DATA",
      "DATA_GET",
      ModulesRequest,
      { modules },
      ignoreReply,
    );

    return yield* collectModules(subscription, modules);
  }, Effect.scoped);

  const registerDataListener = Effect.fn(
    "SystemBridgeWebSocket.registerDataListener",
  )(function* (modules: ReadonlyArray<ModuleName>) {
    yield* call(
      "REGISTER_DATA_LISTENER",
      "DATA_LISTENER_REGISTERED",
      ModulesRequest,
      { modules },
      ignoreReply,
    );
  });

  const unregisterDataListener = call(
    "UNREGISTER_DATA_LISTENER",
    "DATA_LISTENER_UNREGISTERED",
    Empty,
    {},
    ignoreReply,
  ).pipe(
    Effect.asVoid,
    Effect.withSpan("SystemBridgeWebSocket.unregisterDataListener"),
  );

  const getDirectories = call(
    "GET_DIRECTORIES",
    "DIRECTORIES",
    Empty,
    {},
    listOrEmpty(MediaDirectory),
  ).pipe(
    Effect.map((directories) => directories ?? []),
    Effect.withSpan("SystemBridgeWebSocket.getDirectories"),
  );

  const getDirectory = Effect.fn("SystemBridgeWebSocket.getDirectory")(
    function* (base: string) {
      return yield* call(
        "GET_DIRECTORY",
        "DIRECTORY",
        DirectoryRequest,
        { base },
        Directory,
      );
    },
  );

  const getFiles = Effect.fn("SystemBridgeWebSocket.getFiles")(function* (
    request: GetFilesRequest,
  ) {
    const files = yield* call(
      "GET_FILES",
      "FILES",
      GetFilesRequest,
      request,
      listOrEmpty(FileInfo),
    );

    return files ?? [];
  });

  const getFile = Effect.fn("SystemBridgeWebSocket.getFile")(function* (
    path: string,
  ) {
    return yield* call("GET_FILE", "FILE", PathRequest, { path }, FileInfo);
  });

  const getDiskMounts = call(
    "GET_DISK_MOUNTS",
    "DISK_MOUNTS",
    Empty,
    {},
    DiskMountsResponse,
  ).pipe(Effect.withSpan("SystemBridgeWebSocket.getDiskMounts"));

  const getSettings = call(
    "GET_SETTINGS",
    "SETTINGS_RESULT",
    Empty,
    {},
    Settings,
  ).pipe(Effect.withSpan("SystemBridgeWebSocket.getSettings"));

  const updateSettings = Effect.fn("SystemBridgeWebSocket.updateSettings")(
    function* (settings: Settings) {
      return yield* call(
        "UPDATE_SETTINGS",
        "SETTINGS_UPDATED",
        Settings,
        settings,
        Settings,
      );
    },
  );

  const validateDirectory = Effect.fn(
    "SystemBridgeWebSocket.validateDirectory",
  )(function* (path: string) {
    const result = yield* call(
      "VALIDATE_DIRECTORY",
      "DIRECTORY_VALIDATED",
      PathRequest,
      { path },
      ValidateDirectoryResult,
    );

    return result.valid;
  });

  const executeCommand = Effect.fn("SystemBridgeWebSocket.executeCommand")(
    function* (commandID: string) {
      return yield* call(
        "COMMAND_EXECUTE",
        "COMMAND_COMPLETED",
        CommandRequest,
        { commandID },
        CommandResult,
      );
    },
  );

  const keyboardKeypress = Effect.fn("SystemBridgeWebSocket.keyboardKeypress")(
    function* (keypress: KeyboardKeypress) {
      yield* call(
        "KEYBOARD_KEYPRESS",
        "KEYBOARD_KEY_PRESSED",
        KeyboardKeypress,
        keypress,
        ignoreReply,
      );
    },
  );

  const keyboardText = Effect.fn("SystemBridgeWebSocket.keyboardText")(
    function* (text: KeyboardText) {
      yield* call(
        "KEYBOARD_TEXT",
        "KEYBOARD_TEXT_SENT",
        KeyboardText,
        text,
        ignoreReply,
      );
    },
  );

  const mediaControl = Effect.fn("SystemBridgeWebSocket.mediaControl")(
    function* (action: MediaAction) {
      yield* call(
        "MEDIA_CONTROL",
        "MEDIA_CONTROLLED",
        MediaControl,
        { action },
        ignoreReply,
      );
    },
  );

  const discordControl = Effect.fn("SystemBridgeWebSocket.discordControl")(
    function* (control: DiscordControl) {
      yield* call(
        "DISCORD_CONTROL",
        "DISCORD_CONTROLLED",
        DiscordControl,
        control,
        ignoreReply,
      );
    },
  );

  const sendNotification = Effect.fn("SystemBridgeWebSocket.sendNotification")(
    function* (notification: Notification) {
      yield* call(
        "NOTIFICATION",
        "NOTIFICATION_SENT",
        Notification,
        notification,
        ignoreReply,
      );
    },
  );

  const open = Effect.fn("SystemBridgeWebSocket.open")(function* (
    target: OpenTarget,
  ) {
    yield* call("OPEN", "OPENED", OpenTarget, target, ignoreReply);
  });

  const power = Effect.fn("SystemBridgeWebSocket.power")(function* (
    action: PowerAction,
  ) {
    const [event, expected] = powerEvents[action];

    yield* call(event, expected, Empty, {}, ignoreReply);
  });

  const exitBackend = nextId.pipe(
    Effect.flatMap((id) => write("EXIT_APPLICATION", id, Empty, {})),
    Effect.withSpan("SystemBridgeWebSocket.exitBackend"),
  );

  return SystemBridgeWebSocket.of({
    updates,
    closed: Deferred.await(closed),
    getData,
    registerDataListener,
    unregisterDataListener,
    getDirectories,
    getDirectory,
    getFiles,
    getFile,
    getDiskMounts,
    getSettings,
    updateSettings,
    validateDirectory,
    executeCommand,
    keyboardKeypress,
    keyboardText,
    mediaControl,
    discordControl,
    sendNotification,
    open,
    power,
    exitBackend,
  });
});

export class SystemBridgeWebSocket extends Context.Service<
  SystemBridgeWebSocket,
  Interface
>()("@timmo001/effect-system-bridge/SystemBridgeWebSocket") {
  /** Needs a `WebSocketConstructor`. The socket closes with the layer. */
  static readonly layer = (options: WebSocketOptions) =>
    Layer.effect(SystemBridgeWebSocket, make(options));

  /** Uses the global `WebSocket`. */
  static readonly layerGlobal = (options: WebSocketOptions) =>
    SystemBridgeWebSocket.layer(options).pipe(
      Layer.provide(Socket.layerWebSocketConstructorGlobal),
    );
}
