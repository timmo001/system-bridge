import {
  BadRequestError,
  ConnectionError,
  ModuleName,
  SystemBridgeWebSocket,
  type AudioControl,
  type DataMissingError,
  type DesktopWindowStateRequest,
  type DiscordControl,
  type DisplayControl,
  HyprlandDirection,
  HyprlandDispatcher,
  type HyprlandEvent,
  type HyprlandSetWindowRequest,
  type KeepAwakeRequest,
  type MediaControl,
  ModuleDataUpdate,
  type ModulesData,
  type Notification,
  type OmarchyAction,
  type OpenTarget,
  type Settings,
  type SettingsCommandDefinition,
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
  Schema,
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
      // The backend's messages are Go errors, which start in lower case
      return `${error.message.charAt(0).toUpperCase()}${error.message.slice(1)}`;
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

/** Why an action failed, if it did, for an alert listing failures. */
const failureMessage = (
  result: AsyncResult.AsyncResult<unknown, BridgeError>,
): string[] => {
  const outcome = actionResult(result, "");

  return outcome?.success === false ? [outcome.message] : [];
};

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
export const socket = (get: Atom.AtomContext) =>
  get.result(connection).pipe(Effect.flatMap(connected));

export const fnSocket = (get: Atom.FnContext) =>
  get.result(connection).pipe(Effect.flatMap(connected));

/**
 * The module data so far, and which modules have answered. A module that
 * answered without data, or timed out, isn't reported on this system.
 */
export interface ModuleState {
  readonly data: ModulesData;
  readonly settled: ReadonlySet<ModuleName>;
}

const noModules: ModuleState = { data: {}, settled: new Set() };

/** One module's data, or that it settled without any. */
type ModuleEvent =
  | { readonly _tag: "Data"; readonly update: ModuleDataUpdate }
  | { readonly _tag: "Missing"; readonly module: ModuleName };

const applyEvent = (state: ModuleState, event: ModuleEvent): ModuleState => {
  const module = event._tag === "Data" ? event.update.module : event.module;
  const settled = new Set(state.settled).add(module);

  return event._tag === "Data"
    ? {
        data: Struct.assign(state.data, {
          [event.update.module]: event.update.data,
        }),
        settled,
      }
    : { data: state.data, settled };
};

/**
 * Every module's data, kept up to date by the backend's data listener. Each
 * module is asked for on its own, so a page shows as soon as its module
 * answers, and one that never reports, such as Discord when it isn't
 * running, holds up nothing else.
 */
export const moduleData = Atom.make((get) =>
  Stream.unwrap(
    Effect.gen(function* () {
      const bridge = yield* socket(get);

      yield* bridge.registerDataListener(ModuleName.literals);

      const initial = Stream.fromIterable(ModuleName.literals).pipe(
        Stream.mapEffect(
          (module) =>
            bridge.getData([module]).pipe(
              Effect.map((data): ModuleEvent => {
                const update = Option.getOrUndefined(
                  decodeModuleUpdate({ module, data: data[module] }),
                );

                return update === undefined
                  ? { _tag: "Missing", module }
                  : { _tag: "Data", update };
              }),
              Effect.catch(() =>
                Effect.succeed<ModuleEvent>({ _tag: "Missing", module }),
              ),
            ),
          { concurrency: "unbounded" },
        ),
      );

      const updates = bridge.updates.pipe(
        Stream.map((update): ModuleEvent => ({ _tag: "Data", update })),
      );

      return Stream.merge(initial, updates).pipe(
        Stream.scan(() => noModules, applyEvent),
      );
    }),
  ),
).pipe(Atom.keepAlive);

const decodeModuleUpdate = Schema.decodeUnknownOption(ModuleDataUpdate);

/** The latest module state, kept through reconnects. */
export const moduleState = Atom.make((get): ModuleState =>
  AsyncResult.getOrElse(get(moduleData), () => noModules),
);

/** The latest module data, kept through reconnects. */
export const latestModuleData = Atom.make(
  (get): ModulesData => get(moduleState).data,
);

/**
 * The backend's settings, kept up to date with changes from any client, so a
 * page never saves over another tab's changes with a stale copy.
 */
export const settings = Atom.make((get) =>
  Stream.unwrap(
    socket(get).pipe(
      Effect.map((bridge) =>
        Stream.merge(
          Stream.fromEffect(bridge.getSettings),
          bridge.settingsChanges,
        ),
      ),
    ),
  ),
).pipe(Atom.keepAlive);

export const diskMounts = Atom.make((get) =>
  socket(get).pipe(Effect.flatMap((bridge) => bridge.getDiskMounts)),
);

export const commandPrefabs = Atom.make((get) =>
  socket(get).pipe(Effect.flatMap((bridge) => bridge.getCommandPrefabs)),
);

export const updateSettings = Atom.fn((next: Settings, get) =>
  fnSocket(get).pipe(
    Effect.flatMap((bridge) => bridge.updateSettings(next)),
    Effect.tap(() => Effect.sync(() => get.refresh(settings))),
  ),
);

/** One change to the command allowlist. */
export type CommandChange =
  | {
      readonly kind: "add" | "update";
      readonly command: SettingsCommandDefinition;
    }
  | { readonly kind: "remove"; readonly id: string };

/**
 * Adds, changes or removes one command, leaving the rest as the backend has
 * them. The new settings arrive through `settings` like any other change.
 */
export const changeCommand = Atom.fn((change: CommandChange, get) =>
  fnSocket(get).pipe(
    Effect.flatMap((bridge) => {
      switch (change.kind) {
        case "add":
          return bridge.addCommand(change.command);
        case "update":
          return bridge.updateCommand(change.command);
        case "remove":
          return bridge.removeCommand(change.id);
      }
    }),
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

/**
 * Where the Discord connection is up to. Changes only when it connects,
 * disconnects, signs in or fails, so the setup below re-reads at those
 * moments.
 */
const discordProgress = Atom.make((get): string => {
  const discord = get(latestModuleData).discord;

  return `${String(discord?.connected)}:${String(discord?.authenticated)}:${discord?.error ?? ""}`;
});

/** How far Discord is set up, kept current as the connection changes. */
export const discordSetup = Atom.make((get) => {
  get(discordProgress);

  return socket(get).pipe(Effect.flatMap((bridge) => bridge.getDiscordSetup));
});

/** Saves the Discord application to authorize as. */
export const updateDiscordSetup = Atom.fn(
  (credentials: { clientId: string; clientSecret: string }, get) =>
    fnSocket(get).pipe(
      Effect.flatMap((bridge) =>
        bridge.updateDiscordSetup({
          clientId: credentials.clientId,
          clientSecret: Redacted.make(credentials.clientSecret),
        }),
      ),
      Effect.tap(() => Effect.sync(() => get.refresh(discordSetup))),
    ),
);

export const sendNotification = Atom.fn((notification: Notification, get) =>
  fnSocket(get).pipe(
    Effect.flatMap((bridge) => bridge.sendNotification(notification)),
  ),
);

export const open = Atom.fn((target: OpenTarget, get) =>
  fnSocket(get).pipe(Effect.flatMap((bridge) => bridge.open(target))),
);

/** Sets an audio device's volume or mute, or makes it the default, one atom per device. */
export const audioControl = Atom.family((id: string) =>
  Atom.fn((control: Omit<AudioControl, "id">, get) =>
    fnSocket(get).pipe(
      Effect.flatMap((bridge) => bridge.audioControl({ ...control, id })),
    ),
  ),
);

/** Something to do to a paired Bluetooth device. */
export type BluetoothAction = "connect" | "disconnect" | "forget";

/** Connects, disconnects or forgets a paired device, one atom per address. */
export const bluetoothAction = Atom.family((address: string) =>
  Atom.fn((action: BluetoothAction, get) =>
    fnSocket(get).pipe(
      Effect.flatMap((bridge) => {
        switch (action) {
          case "connect":
            return bridge.bluetoothConnect({ address });
          case "disconnect":
            return bridge.bluetoothDisconnect({ address });
          case "forget":
            return bridge.bluetoothForget({ address });
        }
      }),
    ),
  ),
);

/** Switches the power profile, to one of the system data's `power_profiles`. */
export const setPowerProfile = Atom.fn((profile: string, get) =>
  fnSocket(get).pipe(
    Effect.flatMap((bridge) => bridge.setPowerProfile({ profile })),
  ),
);

/** Keeps the system awake, optionally for `duration` seconds, or lets it idle. */
export const setKeepAwake = Atom.fn((request: KeepAwakeRequest, get) =>
  fnSocket(get).pipe(Effect.flatMap((bridge) => bridge.setKeepAwake(request))),
);

/** Turns the Bluetooth adapter on or off. */
export const setBluetoothPower = Atom.fn((powered: boolean, get) =>
  fnSocket(get).pipe(
    Effect.flatMap((bridge) => bridge.bluetoothSetPower({ powered })),
  ),
);

/**
 * Why the Bluetooth actions that failed last time failed: turning the adapter
 * on or off, and each listed device's. Takes the addresses joined with
 * newlines, so the family can cache it.
 */
export const bluetoothFailures = Atom.family((addresses: string) =>
  Atom.make((get) =>
    [
      get(setBluetoothPower),
      ...addresses
        .split("\n")
        .filter((address) => address.length > 0)
        .map((address) => get(bluetoothAction(address))),
    ].flatMap(failureMessage),
  ),
);

export const discordControl = Atom.fn((control: DiscordControl, get) =>
  fnSocket(get).pipe(
    Effect.flatMap((bridge) => bridge.discordControl(control)),
  ),
);

/** Sets a display's brightness or power state, one atom per display. */
export const displayControl = Atom.family((id: string) =>
  Atom.fn((control: Omit<DisplayControl, "id">, get) =>
    fnSocket(get).pipe(
      Effect.flatMap((bridge) => bridge.displayControl({ ...control, id })),
    ),
  ),
);

export const mediaControl = Atom.fn((control: MediaControl, get) =>
  fnSocket(get).pipe(Effect.flatMap((bridge) => bridge.mediaControl(control))),
);

/** Something to do to a window. */
export type WindowAction =
  | { readonly _tag: "close" }
  | { readonly _tag: "focus" }
  | { readonly _tag: "kill" }
  | { readonly _tag: "move"; readonly workspace: string }
  | {
      readonly _tag: "set";
      readonly settings: Omit<HyprlandSetWindowRequest, "id">;
    }
  | {
      readonly _tag: "state";
      readonly state: Omit<DesktopWindowStateRequest, "id">;
    };

/** Focuses, closes, moves or changes a window, one atom per window. */
export const windowAction = Atom.family((id: string) =>
  Atom.fn((action: WindowAction, get) =>
    fnSocket(get).pipe(
      Effect.flatMap((bridge) => {
        switch (action._tag) {
          case "close":
            return bridge.desktopCloseWindow({ id });
          case "focus":
            return bridge.desktopFocusWindow({ id });
          case "kill":
            return bridge.hyprlandKillWindow({ id });
          case "move":
            return bridge.hyprlandMoveWindow({
              id,
              workspace: action.workspace,
            });
          case "set":
            return bridge.hyprlandSetWindow({ ...action.settings, id });
          case "state":
            return bridge.desktopSetWindowState({ ...action.state, id });
        }
      }),
    ),
  ),
);

/** Shows and focuses a workspace, one atom per workspace. */
export const focusWorkspace = Atom.family((id: string) =>
  Atom.fn((_: undefined, get) =>
    fnSocket(get).pipe(
      Effect.flatMap((bridge) => bridge.desktopFocusWorkspace({ id })),
    ),
  ),
);

/** Something to do to a workspace on Hyprland. */
export type WorkspaceAction =
  | { readonly _tag: "rename"; readonly name: string }
  | { readonly _tag: "move"; readonly display: string };

/** Renames a workspace or moves it to a display, one atom per workspace. */
export const workspaceAction = Atom.family((id: string) =>
  Atom.fn((action: WorkspaceAction, get) =>
    fnSocket(get).pipe(
      Effect.flatMap((bridge) =>
        action._tag === "rename"
          ? bridge.hyprlandRenameWorkspace({ id, name: action.name })
          : bridge.hyprlandMoveWorkspace({ id, display: action.display }),
      ),
    ),
  ),
);

/** Switches Hyprland's binds to a submap, or the default with an empty name. */
export const setHyprlandSubmap = Atom.fn((name: string, get) =>
  fnSocket(get).pipe(
    Effect.flatMap((bridge) =>
      bridge.hyprlandSetSubmap(name === "" ? {} : { name }),
    ),
  ),
);

/** Sets a Hyprland config option, one atom per option. */
export const setHyprlandOption = Atom.family((name: string) =>
  Atom.fn((value: boolean | number, get) =>
    fnSocket(get).pipe(
      Effect.flatMap((bridge) => bridge.hyprlandSetOption({ name, value })),
    ),
  ),
);

/** A Hyprland query or action from the tools card, by what it needs. */
export type HyprlandTool =
  | { readonly _tag: "getOption"; readonly name: string }
  | {
      readonly _tag: "setOption";
      readonly name: string;
      readonly value: string;
    }
  | { readonly _tag: "cursor" }
  | { readonly _tag: "moveCursor"; readonly x: number; readonly y: number }
  | { readonly _tag: "log" }
  | { readonly _tag: "event"; readonly name: string }
  | { readonly _tag: "exec"; readonly command: string }
  | { readonly _tag: "raw"; readonly dispatch: string }
  | { readonly _tag: "eval"; readonly code: string };

/** Runs a Hyprland tool, with what it read or did as text for the page. */
export const hyprlandTool = Atom.fn((tool: HyprlandTool, get) =>
  fnSocket(get).pipe(
    Effect.flatMap((bridge): Effect.Effect<string, BridgeError> => {
      switch (tool._tag) {
        case "getOption":
          return bridge
            .hyprlandGetOption({ name: tool.name })
            .pipe(Effect.map((option) => JSON.stringify(option, null, 2)));
        case "setOption":
          return bridge
            .hyprlandSetOption({ name: tool.name, value: tool.value })
            .pipe(Effect.as(`Set ${tool.name} until the config reloads`));
        case "cursor":
          return bridge.hyprlandGetCursorPosition.pipe(
            Effect.map((position) => `${position.x}, ${position.y}`),
          );
        case "moveCursor":
          return bridge
            .hyprlandMoveCursor({ x: tool.x, y: tool.y })
            .pipe(Effect.as(`Moved the pointer to ${tool.x}, ${tool.y}`));
        case "log":
          return bridge.hyprlandGetLog.pipe(
            Effect.map((log) => log.lines.join("\n")),
          );
        case "event":
          return bridge
            .hyprlandSendEvent({ name: tool.name })
            .pipe(Effect.as(`Sent ${tool.name}`));
        case "exec":
          return bridge
            .hyprlandExec({ command: tool.command })
            .pipe(Effect.as("Ran the command"));
        case "raw":
          return bridge
            .hyprlandDispatchRaw({ dispatch: tool.dispatch })
            .pipe(Effect.as("Ran the dispatch"));
        case "eval":
          return bridge
            .hyprlandEval({ code: tool.code })
            .pipe(Effect.as("Ran the Lua"));
      }
    }),
  ),
);

/** A custom event from Hyprland, and when it arrived. */
export interface ReceivedHyprlandEvent extends HyprlandEvent {
  readonly received: number;
}

const HYPRLAND_EVENTS_KEPT = 10;

/** The latest custom events from Hyprland's event dispatcher, newest first. */
export const hyprlandEvents = Atom.make((get) =>
  Stream.unwrap(
    socket(get).pipe(
      Effect.map((bridge) =>
        bridge.hyprlandEvents.pipe(
          Stream.scan(
            (): readonly ReceivedHyprlandEvent[] => [],
            (events, event) =>
              [{ data: event.data, received: Date.now() }, ...events].slice(
                0,
                HYPRLAND_EVENTS_KEPT,
              ),
          ),
        ),
      ),
    ),
  ),
).pipe(Atom.keepAlive);

/** Ends a process, by its id, one atom per process. */
export const killProcess = Atom.family((id: number) =>
  Atom.fn((force: boolean, get) =>
    fnSocket(get).pipe(
      Effect.flatMap((bridge) => bridge.killProcess({ id, force })),
    ),
  ),
);

/** Switches to a keyboard layout, one atom per layout. */
export const setKeyboardLayout = Atom.family((layout: string) =>
  Atom.fn((_: undefined, get) =>
    fnSocket(get).pipe(
      Effect.flatMap((bridge) => bridge.desktopSetKeyboardLayout({ layout })),
    ),
  ),
);

/** Triggers a Hyprland global shortcut, one atom per shortcut. */
export const runGlobalShortcut = Atom.family((name: string) =>
  Atom.fn((_: undefined, get) =>
    fnSocket(get).pipe(
      Effect.flatMap((bridge) => bridge.hyprlandRunGlobalShortcut({ name })),
    ),
  ),
);

export const reloadHyprlandConfig = Atom.fn((_: undefined, get) =>
  fnSocket(get).pipe(Effect.flatMap((bridge) => bridge.hyprlandReloadConfig)),
);

/** Runs a dispatcher that takes no direction on the focused window. */
export const hyprlandDispatch = Atom.family((dispatcher: HyprlandDispatcher) =>
  Atom.fn((_: undefined, get) =>
    fnSocket(get).pipe(
      Effect.flatMap((bridge) => bridge.hyprlandDispatch({ dispatcher })),
    ),
  ),
);

/** The dispatchers that take a direction. */
export type HyprlandDirectionalDispatcher = "move_focus" | "swap_window";

/** Runs a dispatcher towards a direction, one atom per pair. */
export const hyprlandDispatchTowards = Atom.family(
  (dispatcher: HyprlandDirectionalDispatcher) =>
    Atom.family((direction: HyprlandDirection) =>
      Atom.fn((_: undefined, get) =>
        fnSocket(get).pipe(
          Effect.flatMap((bridge) =>
            bridge.hyprlandDispatch({ dispatcher, direction }),
          ),
        ),
      ),
    ),
);

/** Opens, closes or toggles the Omarchy menu at a route, one atom per route. */
export const omarchyMenu = Atom.family((id: string) =>
  Atom.fn((action: OmarchyAction, get) =>
    fnSocket(get).pipe(
      Effect.flatMap((bridge) => bridge.omarchyMenu({ id, action })),
    ),
  ),
);

/** Closes the Omarchy menu, whichever route is open. */
export const closeOmarchyMenu = Atom.fn((_: undefined, get) =>
  fnSocket(get).pipe(
    Effect.flatMap((bridge) => bridge.omarchyMenu({ action: "close" })),
  ),
);

/** Opens, closes or toggles an Omarchy shell panel, one atom per panel. */
export const omarchyPanel = Atom.family((id: string) =>
  Atom.fn((action: OmarchyAction, get) =>
    fnSocket(get).pipe(
      Effect.flatMap((bridge) => bridge.omarchyPanel({ id, action })),
    ),
  ),
);

/**
 * Why the Hyprland and Omarchy actions that failed last time failed:
 * reloading the config, the dispatchers, and each listed menu and panel's.
 * Takes the menu and panel ids listed, as `menu:<id>` and `panel:<id>` joined
 * with newlines, so the family can cache it.
 */
export const desktopFailures = Atom.family((ids: string) =>
  Atom.make((get) => [
    ...failureMessage(get(reloadHyprlandConfig)),
    ...HyprlandDispatcher.literals.flatMap((dispatcher) =>
      dispatcher === "move_focus" || dispatcher === "swap_window"
        ? HyprlandDirection.literals.flatMap((direction) =>
            failureMessage(get(hyprlandDispatchTowards(dispatcher)(direction))),
          )
        : failureMessage(get(hyprlandDispatch(dispatcher))),
    ),
    ...failureMessage(get(closeOmarchyMenu)),
    ...failureMessage(get(setHyprlandSubmap)),
    ...ids
      .split("\n")
      .filter((id) => id.length > 0)
      .flatMap((id) =>
        failureMessage(
          get(
            id.startsWith("menu:")
              ? omarchyMenu(id.slice("menu:".length))
              : omarchyPanel(id.slice("panel:".length)),
          ),
        ),
      ),
  ]),
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
