import type { ReactiveController, ReactiveControllerHost } from "lit";
import type { z } from "zod";

import type { BridgeSettingsState } from "~/contexts/bridge-settings";
import type { ConnectionSettings } from "~/contexts/connection";
import type { ConnectionStatus } from "~/contexts/connection-status";
import {
  CONNECTION_TIMEOUT,
  UPDATE_TIMEOUT,
  MAX_RETRIES,
  RETRY_DELAY,
} from "~/contexts/websocket";
import type { WebSocketActions } from "~/contexts/websocket-actions";
import {
  DefaultModuleData,
  ModuleNameSchema,
  Modules,
  type ModuleData,
} from "~/lib/system-bridge/types-modules";
import { ModuleDataSchemas } from "~/lib/system-bridge/types-modules-schemas";
import type { Settings } from "~/lib/system-bridge/types-settings";
import {
  WebSocketResponseSchema,
  type WebSocketRequest,
} from "~/lib/system-bridge/types-websocket";
import { generateUUID } from "~/lib/utils";

interface PendingResolver<T = unknown> {
  resolve: (value: T | PromiseLike<T>) => void;
  reject: (reason?: unknown) => void;
  schema: z.ZodType<T>;
  timeoutId: number;
}

type AnyPendingResolver = PendingResolver;
type WebSocketResponse = z.infer<typeof WebSocketResponseSchema>;
type ResponseSubtype = WebSocketResponse["subtype"];

interface CommandResult {
  commandID: string;
  exitCode: number;
  stdout: string;
  stderr: string;
  error?: string;
}

type ValidConnectionSettings = ConnectionSettings & { token: string };
type WebSocketControllerHost = ReactiveControllerHost & HTMLElement;

export class WebSocketController implements ReactiveController {
  private readonly host: WebSocketControllerHost;
  private readonly syncContexts: () => void;
  private connection: ConnectionSettings | undefined;

  private _data: ModuleData = DefaultModuleData;

  private _isConnected = false;

  private _settings: Settings | null = null;

  private _error: string | null = null;

  private _retryCount = 0;

  private _isRequestingData = false;

  private _isSettingsUpdatePending = false;

  private _commandExecutions = new Map<
    string,
    {
      isExecuting: boolean;
      result: {
        commandID: string;
        exitCode: number;
        stdout: string;
        stderr: string;
        error?: string;
      } | null;
    }
  >();

  private _settingsUpdateError: {
    requestId: string;
    message: string;
    timestamp: number;
  } | null = null;

  private _commandExecutionCleanupTimeouts = new Map<string, number>();
  private _pendingCommandRequests = new Map<string, string>(); // messageId -> commandId
  private _pendingSettingsRequests = new Set<string>(); // Set of UPDATE_SETTINGS request IDs
  private _pendingMediaControlRequests = new Set<string>(); // Set of MEDIA_CONTROL request IDs
  private _settingsErrorTimeout: number | null = null;

  // Maximum number of command executions to keep in memory
  private readonly MAX_COMMAND_EXECUTIONS = 100;

  private _ws: WebSocket | null = null;
  private _connectionTimeout: number | null = null;
  private _reconnectTimeout: number | null = null;
  private _settingsUpdateTimeout: number | null = null;
  // @ts-expect-error - TS6133: Reserved for future state change detection
  private _previousConnectedState = false;
  private _pendingResolvers = new Map<string, AnyPendingResolver>();
  private _commandExecutionsVersion = 0;
  private readonly _retryConnection = this.retryConnection.bind(this);

  readonly actions: WebSocketActions = {
    sendRequest: this.sendRequest.bind(this),
    sendRequestWithResponse: this.sendRequestWithResponse.bind(this),
    sendCommandExecute: this.sendCommandExecute.bind(this),
  };

  private readonly responseHandlers = new Map<
    WebSocketResponse["type"],
    (message: WebSocketResponse) => void
  >([
    ["DATA_UPDATE", (message) => this.handleDataUpdate(message)],
    ["SETTINGS_RESULT", (message) => this.handleSettingsResult(message)],
    ["SETTINGS_UPDATED", (message) => this.handleSettingsUpdated(message)],
    [
      "NOTIFICATION_SENT",
      (message) => this.dispatchComponentEvent("notification-sent", message.id),
    ],
    [
      "OPENED",
      (message) => this.dispatchComponentEvent("open-success", message.id),
    ],
    ["MEDIA_CONTROLLED", (message) => this.handleMediaControlled(message)],
    ["COMMAND_EXECUTING", (message) => this.handleCommandExecuting(message)],
    ["COMMAND_COMPLETED", (message) => this.handleCommandCompleted(message)],
    ["ERROR", (message) => this.handleError(message)],
  ]);

  private readonly componentRequestErrors: Partial<
    Record<ResponseSubtype, { eventName: string; fallbackMessage: string }>
  > = {
    MISSING_TITLE: {
      eventName: "notification-error",
      fallbackMessage: "Failed to send notification",
    },
    BAD_REQUEST: {
      eventName: "notification-error",
      fallbackMessage: "Failed to send notification",
    },
    BAD_PATH: {
      eventName: "open-error",
      fallbackMessage: "Failed to open",
    },
    MISSING_PATH_URL: {
      eventName: "open-error",
      fallbackMessage: "Failed to open",
    },
  };

  private readonly commandErrorSubtypes = new Set<ResponseSubtype>([
    "COMMAND_NOT_FOUND",
    "BAD_PATH",
    "BAD_DIRECTORY",
    "BAD_REQUEST",
  ]);

  constructor(
    host: WebSocketControllerHost,
    connection: ConnectionSettings,
    syncContexts: () => void,
  ) {
    this.host = host;
    this.syncContexts = syncContexts;
    this.connection = connection;
    this.host.addController(this);
  }

  get status(): ConnectionStatus {
    return {
      isConnected: this._isConnected,
      error: this._error,
      retryConnection: this._retryConnection,
    };
  }

  get data(): ModuleData {
    return this._data;
  }

  get bridgeSettings(): BridgeSettingsState {
    return {
      settings: this._settings,
      settingsUpdateError: this._settingsUpdateError,
      commandExecutions: this._commandExecutions,
    };
  }

  get commandExecutionsVersion(): number {
    return this._commandExecutionsVersion;
  }

  hostConnected() {
    this.connect();
  }

  hostDisconnected() {
    this.cleanup();
  }

  setConnection(connection: ConnectionSettings) {
    this.connection = connection;
    this.handleConnectionChange();
  }

  private requestUpdate(): void {
    this.syncContexts();
    this.host.requestUpdate();
  }

  private markCommandExecutionsChanged(): void {
    this._commandExecutionsVersion++;
  }

  private handleConnectionChange() {
    if (this._ws) {
      this._ws.close();
      this._ws = null;
    }
    this._retryCount = 0;
    this._error = null;
    this.connect();
  }

  private clearAllPendingResolvers(reason: string) {
    this._pendingResolvers.forEach((resolver) => {
      clearTimeout(resolver.timeoutId);
      resolver.reject(new Error(reason));
    });
    this._pendingResolvers.clear();
  }

  private clearConnectionTimeout() {
    if (this._connectionTimeout) {
      clearTimeout(this._connectionTimeout);
      this._connectionTimeout = null;
    }
  }

  private clearReconnectTimeout() {
    if (this._reconnectTimeout) {
      clearTimeout(this._reconnectTimeout);
      this._reconnectTimeout = null;
    }
  }

  private clearSettingsUpdateTimeout() {
    if (this._settingsUpdateTimeout) {
      clearTimeout(this._settingsUpdateTimeout);
      this._settingsUpdateTimeout = null;
    }
  }

  private clearSettingsErrorTimeout() {
    if (this._settingsErrorTimeout !== null) {
      clearTimeout(this._settingsErrorTimeout);
      this._settingsErrorTimeout = null;
    }
  }

  private setDisconnectedError(message: string) {
    this._error = message;
    this._isConnected = false;
    this.requestUpdate();
  }

  private cancelCommandCleanupTimeout(commandID: string) {
    const existingTimeout =
      this._commandExecutionCleanupTimeouts.get(commandID);
    if (existingTimeout !== undefined) {
      clearTimeout(existingTimeout);
      this._commandExecutionCleanupTimeouts.delete(commandID);
    }
  }

  private scheduleCommandCleanup(commandID: string) {
    const cleanupTimeout = window.setTimeout(
      () => {
        this._commandExecutions.delete(commandID);
        this.markCommandExecutionsChanged();
        this._commandExecutionCleanupTimeouts.delete(commandID);
        this.requestUpdate();
      },
      5 * 60 * 1000,
    );

    this._commandExecutionCleanupTimeouts.set(commandID, cleanupTimeout);
  }

  private clearCommandCleanupTimeouts() {
    for (const timeoutId of this._commandExecutionCleanupTimeouts.values()) {
      clearTimeout(timeoutId);
    }
    this._commandExecutionCleanupTimeouts.clear();
  }

  private setCommandResult(result: CommandResult) {
    this.cancelCommandCleanupTimeout(result.commandID);
    this.enforceCommandExecutionsLimit();
    this._commandExecutions.set(result.commandID, {
      isExecuting: false,
      result,
    });
    this.markCommandExecutionsChanged();
    this.requestUpdate();
    this.scheduleCommandCleanup(result.commandID);
  }

  private enforceCommandExecutionsLimit() {
    // Remove oldest completed entries if we exceed the limit
    if (this._commandExecutions.size >= this.MAX_COMMAND_EXECUTIONS) {
      // Find oldest completed entry to remove
      for (const [commandID, execution] of this._commandExecutions) {
        if (!execution.isExecuting) {
          this.cancelCommandCleanupTimeout(commandID);
          this._commandExecutions.delete(commandID);
          this.markCommandExecutionsChanged();
          break; // Only remove one entry at a time
        }
      }
    }
  }

  private clearExecutingCommandsOnDisconnect() {
    // Mark all currently executing commands as failed due to connection loss
    this._commandExecutions.forEach((execution, commandID) => {
      if (execution.isExecuting) {
        this.setCommandResult({
          commandID,
          exitCode: 1,
          stdout: "",
          stderr: "",
          error: "Command execution interrupted due to connection loss",
        });
      }
    });

    // Clear pending command requests since they won't get responses
    this._pendingCommandRequests.clear();
  }

  private parseWebSocketMessage(event: MessageEvent<string>) {
    let parsedMessage;
    try {
      parsedMessage = WebSocketResponseSchema.safeParse(JSON.parse(event.data));
    } catch (error) {
      console.error(
        "Failed to parse WebSocket message:",
        error,
        "Data:",
        event.data,
      );
      this._error = "Received invalid message from server";
      return null;
    }

    if (!parsedMessage.success) {
      console.error(
        "WebSocket message validation failed:",
        parsedMessage.error,
        "Raw data:",
        event.data,
      );
      this._error = "Received invalid message format from server";
      return null;
    }

    return parsedMessage.data;
  }

  private handleMessage(event: MessageEvent<string>) {
    const message = this.parseWebSocketMessage(event);
    if (!message || this.resolvePendingResponse(message)) {
      return;
    }

    this.responseHandlers.get(message.type)?.(message);
    this.requestUpdate();
  }

  private resolvePendingResponse(message: WebSocketResponse) {
    const resolver = this._pendingResolvers.get(message.id);
    if (!resolver) {
      return false;
    }

    clearTimeout(resolver.timeoutId);

    const parsedData = resolver.schema.safeParse(message.data);
    if (!parsedData.success) {
      this._error = "Received invalid message data from server";
      resolver.reject(parsedData.error);
      this._pendingResolvers.delete(message.id);
      return true;
    }

    resolver.resolve(parsedData.data);
    this._pendingResolvers.delete(message.id);
    return true;
  }

  private handleDataUpdate(message: WebSocketResponse) {
    if (!message.module || !message.data) {
      return;
    }

    const update = this.parseDataUpdate(message.module, message.data);
    if (!update) {
      return;
    }

    this._data = {
      ...this._data,
      [update.moduleName]: update.data,
    };
    this._isRequestingData = false;
  }

  private parseDataUpdate(module: string, data: unknown) {
    const moduleValidation = ModuleNameSchema.safeParse(module);
    if (!moduleValidation.success) {
      this._error = `Received invalid module name: ${module}`;
      return null;
    }

    const moduleName = moduleValidation.data;
    const dataValidation = ModuleDataSchemas[moduleName].safeParse(data);
    if (!dataValidation.success) {
      this._error = `Received invalid data for module ${moduleName}`;
      console.error(
        `Module ${moduleName} validation error:`,
        dataValidation.error,
      );
      return null;
    }

    return { moduleName, data: dataValidation.data };
  }

  private normalizeSettings(
    settings: Partial<Settings>,
    current?: Settings | null,
  ): Settings {
    const fallback =
      current ??
      ({
        autostart: false,
        hotkeys: [],
        logLevel: "INFO",
        commands: { allowlist: [] },
        disks: { allowedSecondaryMountPoints: [] },
        media: { directories: [] },
      } satisfies Settings);
    const {
      autostart = fallback.autostart,
      hotkeys = fallback.hotkeys,
      logLevel = fallback.logLevel,
    } = settings;
    const { allowlist = fallback.commands.allowlist } = settings.commands ?? {};
    const {
      allowedSecondaryMountPoints = fallback.disks.allowedSecondaryMountPoints,
    } = settings.disks ?? {};
    const { directories = fallback.media.directories } = settings.media ?? {};

    return {
      autostart,
      hotkeys,
      logLevel,
      commands: { allowlist },
      disks: { allowedSecondaryMountPoints },
      media: { directories },
    };
  }

  private handleSettingsResult(message: WebSocketResponse) {
    if (this._isSettingsUpdatePending) {
      return;
    }

    this._settings = this.normalizeSettings(message.data as Partial<Settings>);
    this._isRequestingData = false;
  }

  private handleSettingsUpdated(message: WebSocketResponse) {
    this._settings = this.normalizeSettings(
      message.data as Partial<Settings>,
      this._settings,
    );
    this._isSettingsUpdatePending = false;
    if (this._settingsUpdateTimeout) {
      clearTimeout(this._settingsUpdateTimeout);
      this._settingsUpdateTimeout = null;
    }
    this._pendingSettingsRequests.delete(message.id);
    this.syncContexts();
    this.dispatchComponentEvent("settings-updated", message.id);
  }

  private dispatchComponentEvent(eventName: string, requestId: string) {
    this.host.dispatchEvent(
      new CustomEvent(eventName, {
        detail: {
          requestId,
          timestamp: Date.now(),
        },
        bubbles: true,
        composed: true,
      }),
    );
  }

  private dispatchComponentError(
    eventName: string,
    requestId: string,
    message: string,
  ) {
    this.host.dispatchEvent(
      new CustomEvent(eventName, {
        detail: {
          requestId,
          message,
          timestamp: Date.now(),
        },
        bubbles: true,
        composed: true,
      }),
    );
  }

  private dispatchWindowEvent(eventName: string, requestId: string) {
    window.dispatchEvent(
      new CustomEvent(eventName, {
        detail: {
          requestId,
          timestamp: Date.now(),
        },
      }),
    );
  }

  private dispatchWindowError(
    eventName: string,
    requestId: string,
    message: string,
  ) {
    window.dispatchEvent(
      new CustomEvent(eventName, {
        detail: {
          requestId,
          message,
          timestamp: Date.now(),
        },
      }),
    );
  }

  private handleMediaControlled(message: WebSocketResponse) {
    this._pendingMediaControlRequests.delete(message.id);
    this.dispatchWindowEvent("media-control-success", message.id);
  }

  private handleCommandExecuting(message: WebSocketResponse) {
    const commandData = message.data as { commandID?: string };
    if (!commandData?.commandID) {
      return;
    }

    this._pendingCommandRequests.delete(message.id);
    this.cancelCommandCleanupTimeout(commandData.commandID);
    this.enforceCommandExecutionsLimit();
    this._commandExecutions.set(commandData.commandID, {
      isExecuting: true,
      result: null,
    });
    this.markCommandExecutionsChanged();
    this.requestUpdate();
  }

  private handleCommandCompleted(message: WebSocketResponse) {
    const result = message.data as CommandResult;
    if (!result?.commandID) {
      return;
    }

    this._pendingCommandRequests.delete(message.id);
    this.setCommandResult(result);
  }

  private handleError(message: WebSocketResponse) {
    if (message.subtype === "BAD_TOKEN") {
      this.handleBadTokenError();
      return;
    }

    this.dispatchRequestErrors(message);

    const errorMessage = message.message ?? "Unknown error";
    this._error = `Server error: ${errorMessage}`;
    this.handleSettingsErrorIfPending(message.id, errorMessage);
    this.handleCommandErrorIfPending(message, errorMessage);
  }

  private handleBadTokenError() {
    this._error =
      "Invalid API token. Please check your connection settings and update your token.";
    this._isConnected = false;
    this._retryCount = MAX_RETRIES + 1;
    this._ws?.close();
  }

  private handleSettingsErrorIfPending(requestId: string, message: string) {
    if (this._pendingSettingsRequests.has(requestId)) {
      this.handleSettingsUpdateError(requestId, message);
    }
  }

  private handleCommandErrorIfPending(
    message: WebSocketResponse,
    errorMessage: string,
  ) {
    if (this.isCommandError(message.subtype)) {
      this.handleCommandError(message.id, errorMessage);
    }
  }

  private dispatchRequestErrors(message: WebSocketResponse) {
    const componentError = this.componentRequestErrors[message.subtype];
    if (componentError) {
      this.dispatchComponentError(
        componentError.eventName,
        message.id,
        message.message ?? componentError.fallbackMessage,
      );
    }
    this.dispatchMediaControlError(message);
  }

  private dispatchMediaControlError(message: WebSocketResponse) {
    if (!this._pendingMediaControlRequests.has(message.id)) return;
    this._pendingMediaControlRequests.delete(message.id);
    this.dispatchWindowError(
      "media-control-error",
      message.id,
      message.message ?? "Failed to control media",
    );
  }

  private handleSettingsUpdateError(requestId: string, message: string) {
    this.clearSettingsErrorTimeout();

    this._isSettingsUpdatePending = false;
    this.clearSettingsUpdateTimeout();

    this._settingsUpdateError = {
      requestId,
      message,
      timestamp: Date.now(),
    };
    this._pendingSettingsRequests.delete(requestId);
    this.dispatchComponentError("settings-update-error", requestId, message);

    this._settingsErrorTimeout = window.setTimeout(() => {
      this._settingsUpdateError = null;
      this._settingsErrorTimeout = null;
      this.syncContexts();
    }, 10000);

    this.requestUpdate();
  }

  private isCommandError(subtype: ResponseSubtype) {
    return this.commandErrorSubtypes.has(subtype);
  }

  private handleCommandError(requestId: string, message: string) {
    const commandId = this._pendingCommandRequests.get(requestId);
    if (!commandId) {
      return;
    }

    this.setCommandResult({
      commandID: commandId,
      exitCode: 1,
      stdout: "",
      stderr: "",
      error: message,
    });
    this._pendingCommandRequests.delete(requestId);
  }

  /** Returns an error message if host/port/token are missing, or null if valid. */
  private getConnectionFieldError(): string | null {
    const { host, port, token } = this.connection!;
    if (!host || !port)
      return "Connection settings are incomplete. Please configure host and port.";
    if (!token)
      return "API token is required. Please configure your token in connection settings.";
    return null;
  }

  private getValidConnectionSettings(): ValidConnectionSettings | null {
    if (!this.connection) return null;

    const fieldError = this.getConnectionFieldError();
    if (fieldError) {
      this.setDisconnectedError(fieldError);
      return null;
    }

    return { ...this.connection, token: this.connection.token! };
  }

  private startConnectionTimeout() {
    this.clearConnectionTimeout();
    this._connectionTimeout = window.setTimeout(() => {
      const ws = this._ws;
      if (ws?.readyState !== WebSocket.CONNECTING) {
        return;
      }

      ws.close();
      this.setDisconnectedError(
        "Connection timeout. Please check your host, port, and network connection.",
      );
    }, CONNECTION_TIMEOUT);
  }

  private createWebSocketConnection(host: string, port: number, ssl: boolean) {
    try {
      return new WebSocket(
        `${ssl ? "wss" : "ws"}://${host}:${port}/api/websocket`,
      );
    } catch (error) {
      console.error("Failed to create WebSocket connection:", error);
      this.setDisconnectedError(
        "Failed to create connection. Please check your connection settings.",
      );
      return null;
    }
  }

  private attachSocketHandlers(ws: WebSocket, token: string) {
    ws.onopen = () => this.handleSocketOpen(token);
    ws.onclose = (event) => this.handleSocketClose(event);
    ws.onerror = () => this.handleSocketError();
    ws.onmessage = this.handleMessage.bind(this);
  }

  private handleSocketOpen(token: string) {
    this._isConnected = true;
    this._error = null;
    this._retryCount = 0;
    this.clearConnectionTimeout();
    this.clearReconnectTimeout();
    this._previousConnectedState = true;
    this.requestInitialData(token);
    this.requestUpdate();
  }

  private requestInitialData(token: string) {
    if (this._isRequestingData) {
      return;
    }

    this._isRequestingData = true;
    this.sendRequest({
      id: generateUUID(),
      event: "GET_SETTINGS",
      token,
    });
    this.sendRequest({
      id: generateUUID(),
      event: "GET_DATA",
      data: { modules: Modules },
      token,
    });
    this.sendRequest({
      id: generateUUID(),
      event: "REGISTER_DATA_LISTENER",
      data: { modules: Modules },
      token,
    });
  }

  private handleSocketClose(event: CloseEvent) {
    this._isConnected = false;
    this.clearConnectionTimeout();
    this.clearAllPendingResolvers("WebSocket connection closed");
    this.clearExecutingCommandsOnDisconnect();
    this._previousConnectedState = false;
    this.applyCloseError(event);
    this.requestUpdate();
    this.scheduleReconnect();
  }

  private applyCloseError(event: CloseEvent) {
    const knownCloseError = this.getKnownCloseError(event.code);
    if (knownCloseError) {
      this._error = knownCloseError;
      return;
    }

    if (event.code !== 1000 && event.code !== 1001) {
      this._error = this.formatCloseError(event);
    }
  }

  private formatCloseError(event: CloseEvent): string {
    return `Connection closed with code ${event.code}: ${event.reason || "Unknown reason"}`;
  }

  private getKnownCloseError(code: number) {
    if (code === 1003) {
      this._retryCount = MAX_RETRIES + 1;
    }

    return (
      {
        1006: "Connection closed unexpectedly. Please check your host and port settings.",
        1002: "Connection failed due to protocol error.",
        1003: "Invalid API token. Please check your connection settings.",
      } as Record<number, string>
    )[code];
  }

  private handleSocketError() {
    this._isConnected = false;
    this.clearConnectionTimeout();
    this.clearAllPendingResolvers("WebSocket connection error");
    this.clearExecutingCommandsOnDisconnect();
    if (this._retryCount === 0) {
      this._error =
        "Connection failed. Please check your host, port, and network connection.";
    }
    this.requestUpdate();
  }

  private connect() {
    const connection = this.getValidConnectionSettings();
    if (!connection || this._ws) {
      return;
    }

    const { host, port, ssl, token } = connection;
    this.startConnectionTimeout();
    this._ws = this.createWebSocketConnection(host, port, ssl);
    if (!this._ws) {
      return;
    }

    this.attachSocketHandlers(this._ws, token);
  }

  private scheduleReconnect() {
    if (!this.hasReconnectSettings() || this._isConnected) {
      return;
    }

    this.clearReconnectTimeout();
    this._reconnectTimeout = window.setTimeout(() => {
      this.handleReconnectTimeout();
    }, RETRY_DELAY);
  }

  private hasReconnectSettings() {
    return Boolean(
      this.connection?.host && this.connection.port && this.connection.token,
    );
  }

  private handleReconnectTimeout() {
    if (this._retryCount >= MAX_RETRIES) {
      this._error = `Failed to connect after ${MAX_RETRIES} attempts. Please check your connection settings and try again.`;
      this.requestUpdate();
      return;
    }

    this._retryCount++;
    this._ws = null;
    this.connect();
  }

  sendCommandExecute(messageId: string, commandId: string, token: string) {
    if (this._ws?.readyState !== WebSocket.OPEN) return;

    // Track this command execution request
    this._pendingCommandRequests.set(messageId, commandId);

    // Send the command execute request
    this._ws.send(
      JSON.stringify({
        id: messageId,
        event: "COMMAND_EXECUTE",
        data: {
          commandID: commandId,
        },
        token: token,
      }),
    );
  }

  sendRequest(request: WebSocketRequest) {
    if (this._ws?.readyState !== WebSocket.OPEN) return;
    if (!request.token) throw new Error("No token found");

    this.trackRequest(request);
    this._ws.send(JSON.stringify(request));
  }

  private trackRequest(request: WebSocketRequest) {
    if (request.event === "UPDATE_SETTINGS") {
      this.trackSettingsUpdateRequest(request.id);
    }

    if (request.event === "MEDIA_CONTROL") {
      this.trackMediaControlRequest(request.id);
    }
  }

  private trackSettingsUpdateRequest(requestId: string) {
    this._isSettingsUpdatePending = true;
    this._pendingSettingsRequests.add(requestId);
    this.clearSettingsUpdateTimeout();
    this._settingsUpdateTimeout = window.setTimeout(() => {
      this.handleSettingsUpdateTimeout(requestId);
    }, UPDATE_TIMEOUT);
  }

  private handleSettingsUpdateTimeout(requestId: string) {
    this._isSettingsUpdatePending = false;
    this._pendingSettingsRequests.delete(requestId);
    this._error =
      "Settings update timed out. Please try again or check your connection.";
    this.requestUpdate();
  }

  private trackMediaControlRequest(requestId: string) {
    this._pendingMediaControlRequests.add(requestId);
  }

  /**
   * Throws if the WebSocket is not open or the request has no id.
   * Called inside the Promise executor so thrown errors reject the promise.
   */
  private validateRequestReady(request: WebSocketRequest) {
    if (this._ws?.readyState !== WebSocket.OPEN) {
      throw new Error("WebSocket is not connected");
    }
    if (!request.id) {
      throw new Error("Request must have an id");
    }
  }

  private startRequestTimeout(
    requestId: string,
    reject: (reason: Error) => void,
  ): number {
    return window.setTimeout(() => {
      if (this._pendingResolvers.has(requestId)) {
        this._pendingResolvers.delete(requestId);
        reject(new Error("WebSocket response timed out"));
      }
    }, UPDATE_TIMEOUT);
  }

  private sendTrackedRequest(request: WebSocketRequest, timeoutId: number) {
    try {
      this._ws!.send(JSON.stringify(request));
    } catch (e) {
      clearTimeout(timeoutId);
      this._pendingResolvers.delete(request.id);
      throw e instanceof Error ? e : new Error("Unknown error");
    }
  }

  sendRequestWithResponse<T>(
    request: WebSocketRequest,
    schema: z.ZodType<T>,
  ): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      this.validateRequestReady(request);
      const timeoutId = this.startRequestTimeout(request.id, reject);
      this._pendingResolvers.set(request.id, {
        resolve: resolve as (value: unknown) => void,
        reject,
        schema,
        timeoutId,
      });
      this.sendTrackedRequest(request, timeoutId);
    });
  }

  retryConnection() {
    this._error = null;
    this._retryCount = 0;
    this.clearAllPendingResolvers("WebSocket connection retried");
    if (this._ws) {
      this._ws.close();
      this._ws = null;
    }
    this.connect();
  }

  private cleanup() {
    this.closeWebSocket();
    this.clearConnectionTimeout();
    this.clearReconnectTimeout();
    this.clearSettingsUpdateTimeout();
    this.clearSettingsErrorTimeout();
    this.clearCommandCleanupTimeouts();
    this._commandExecutions.clear();
    this.markCommandExecutionsChanged();
    this._pendingCommandRequests.clear();
    this._pendingSettingsRequests.clear();
    this._pendingMediaControlRequests.clear();
    this.clearAllPendingResolvers("WebSocket provider disconnected");
  }

  private closeWebSocket() {
    if (this._ws) {
      this._ws.close();
      this._ws = null;
    }
  }
}
