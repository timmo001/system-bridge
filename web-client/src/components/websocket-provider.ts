import { ContextConsumer, ContextProvider } from "@lit/context";
import { Duration, type Schema } from "effect";
import { html } from "lit";
import { customElement, state } from "lit/decorators.js";

import {
  connectionContext,
  type ConnectionSettings,
} from "~/contexts/connection";
import {
  websocketContext,
  type WebSocketState,
  UPDATE_TIMEOUT,
  MAX_RETRIES,
  RETRY_DELAY,
} from "~/contexts/websocket";
import {
  connectWithRetry,
  matchError,
  runPromise,
  safeParse,
} from "~/lib/effect";
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
import { ProviderElement } from "~/mixins";

interface PendingResolver<T = unknown> {
  resolve: (value: T | PromiseLike<T>) => void;
  reject: (reason?: unknown) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  schema: Schema.Schema<T, any>;
  timeoutId: number;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyPendingResolver = PendingResolver<any>;

@customElement("websocket-provider")
export class WebSocketProvider extends ProviderElement {
  connection: ConnectionSettings | undefined;

  @state()
  private _data: ModuleData = DefaultModuleData;

  @state()
  private _isConnected = false;

  @state()
  private _settings: Settings | null = null;

  @state()
  private _error: string | null = null;

  @state()
  private _retryCount = 0;

  @state()
  private _isRequestingData = false;

  @state()
  private _isSettingsUpdatePending = false;

  @state()
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
  private _settingsErrorTimeout: number | null = null;

  // Maximum number of command executions to keep in memory
  private readonly MAX_COMMAND_EXECUTIONS = 100;

  private _ws: WebSocket | null = null;
  private _reconnectTimeout: number | null = null;
  private _settingsUpdateTimeout: number | null = null;
  // @ts-expect-error - TS6133: Reserved for future state change detection
  private _previousConnectedState = false;
  private _pendingResolvers = new Map<string, AnyPendingResolver>();
  // Consumer must be stored to keep subscription alive
  // @ts-expect-error - TS6133: Field is used via subscription callback
  private _connectionConsumer!: ContextConsumer<typeof connectionContext, this>;
  private _websocketProvider!: ContextProvider<typeof websocketContext>;

  constructor() {
    super();
    this._connectionConsumer = new ContextConsumer(this, {
      context: connectionContext,
      callback: (value) => {
        this.connection = value;
        this.handleConnectionChange();
      },
      subscribe: true,
    });
    this._websocketProvider = new ContextProvider(this, {
      context: websocketContext,
    });
  }

  private get websocketState(): WebSocketState {
    return {
      data: this._data,
      isConnected: this._isConnected,
      settings: this._settings,
      error: this._error,
      settingsUpdateError: this._settingsUpdateError,
      commandExecutions: this._commandExecutions,
      sendRequest: this.sendRequest.bind(this),
      sendRequestWithResponse: this.sendRequestWithResponse.bind(this),
      sendCommandExecute: this.sendCommandExecute.bind(this),
      retryConnection: this.retryConnection.bind(this),
    };
  }

  private updateWebSocketContext() {
    if (this._websocketProvider) {
      this._websocketProvider.setValue(this.websocketState);
    }
  }

  requestUpdate(name?: PropertyKey, oldValue?: unknown): void {
    super.requestUpdate(name, oldValue);
    this.updateWebSocketContext();
  }

  connectedCallback() {
    super.connectedCallback();
    this.updateWebSocketContext();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.cleanup();
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

  private enforceCommandExecutionsLimit() {
    // Remove oldest completed entries if we exceed the limit
    if (this._commandExecutions.size >= this.MAX_COMMAND_EXECUTIONS) {
      // Find oldest completed entry to remove
      for (const [commandID, execution] of this._commandExecutions) {
        if (!execution.isExecuting) {
          // Cancel any cleanup timeout for this command
          const existingTimeout =
            this._commandExecutionCleanupTimeouts.get(commandID);
          if (existingTimeout !== undefined) {
            clearTimeout(existingTimeout);
            this._commandExecutionCleanupTimeouts.delete(commandID);
          }
          this._commandExecutions.delete(commandID);
          break; // Only remove one entry at a time
        }
      }
    }
  }

  private clearExecutingCommandsOnDisconnect() {
    // Mark all currently executing commands as failed due to connection loss
    this._commandExecutions.forEach((execution, commandID) => {
      if (execution.isExecuting) {
        // Cancel any existing cleanup timeout for this command
        const existingTimeout =
          this._commandExecutionCleanupTimeouts.get(commandID);
        if (existingTimeout !== undefined) {
          clearTimeout(existingTimeout);
          this._commandExecutionCleanupTimeouts.delete(commandID);
        }

        // Set error result for the command
        this._commandExecutions.set(commandID, {
          isExecuting: false,
          result: {
            commandID,
            exitCode: 1,
            stdout: "",
            stderr: "",
            error: "Command execution interrupted due to connection loss",
          },
        });

        // Schedule cleanup after 5 minutes to allow users to see the error
        const cleanupTimeout = window.setTimeout(
          () => {
            this._commandExecutions.delete(commandID);
            this._commandExecutionCleanupTimeouts.delete(commandID);
            this.requestUpdate();
          },
          5 * 60 * 1000,
        ); // 5 minutes

        this._commandExecutionCleanupTimeouts.set(commandID, cleanupTimeout);
      }
    });

    // Clear pending command requests since they won't get responses
    this._pendingCommandRequests.clear();
  }

  private handleMessage(event: MessageEvent<string>) {
    let parsedMessage;
    try {
      parsedMessage = safeParse(
        WebSocketResponseSchema,
        JSON.parse(event.data),
      );
    } catch (error) {
      console.error(
        "Failed to parse WebSocket message:",
        error,
        "Data:",
        event.data,
      );
      this._error = "Received invalid message from server";
      return;
    }

    if (!parsedMessage.success) {
      console.error(
        "WebSocket message validation failed:",
        parsedMessage.error,
        "Raw data:",
        event.data,
      );
      this._error = "Received invalid message format from server";
      return;
    }

    const message = parsedMessage.data;

    if (message.id && this._pendingResolvers.has(message.id)) {
      const resolver = this._pendingResolvers.get(message.id);
      if (!resolver) return;

      // Clear the timeout since we received a response
      clearTimeout(resolver.timeoutId);

      const parsedData = safeParse(resolver.schema, message.data);
      if (parsedData?.success) {
        resolver.resolve(parsedData.data);
      } else {
        this._error = "Received invalid message data from server";
        resolver.reject(parsedData?.error);
      }
      this._pendingResolvers.delete(message.id);
      return;
    }

    switch (message.type) {
      case "DATA_UPDATE": {
        if (!message.module || !message.data) {
          return;
        }
        const moduleValidation = safeParse(ModuleNameSchema, message.module);
        if (!moduleValidation.success) {
          this._error = `Received invalid module name: ${message.module}`;
          return;
        }
        const moduleName = moduleValidation.data;
        const moduleSchema = ModuleDataSchemas[moduleName];
        const dataValidation = safeParse(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          moduleSchema as Schema.Schema<any>,
          message.data,
        );
        if (!dataValidation.success) {
          this._error = `Received invalid data for module ${moduleName}`;
          console.error(
            `Module ${moduleName} validation error:`,
            dataValidation.error,
          );
          return;
        }
        this._data = {
          ...this._data,
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          [moduleName]: dataValidation.data,
        };
        this._isRequestingData = false;
        break;
      }

      case "SETTINGS_RESULT": {
        if (this._isSettingsUpdatePending) {
          break;
        }
        const receivedSettings = message.data as Partial<Settings>;
        this._settings = {
          autostart: receivedSettings.autostart ?? false,
          hotkeys: receivedSettings.hotkeys ?? [],
          logLevel: receivedSettings.logLevel ?? "INFO",
          commands: {
            allowlist: receivedSettings.commands?.allowlist ?? [],
          },
          media: {
            directories: receivedSettings.media?.directories ?? [],
          },
        };
        this._isRequestingData = false;
        break;
      }

      case "DATA_LISTENER_REGISTERED":
        break;

      case "SETTINGS_UPDATED": {
        const updatedSettings = message.data as Partial<Settings>;
        this._settings = {
          autostart:
            updatedSettings.autostart ?? this._settings?.autostart ?? false,
          hotkeys: updatedSettings.hotkeys ?? this._settings?.hotkeys ?? [],
          logLevel:
            updatedSettings.logLevel ?? this._settings?.logLevel ?? "INFO",
          commands: {
            allowlist:
              updatedSettings.commands?.allowlist ??
              this._settings?.commands.allowlist ??
              [],
          },
          media: {
            directories:
              updatedSettings.media?.directories ??
              this._settings?.media.directories ??
              [],
          },
        };
        this._isSettingsUpdatePending = false;
        if (this._settingsUpdateTimeout) {
          clearTimeout(this._settingsUpdateTimeout);
          this._settingsUpdateTimeout = null;
        }
        // Clear pending settings request tracking
        if (this._pendingSettingsRequests.has(message.id)) {
          this._pendingSettingsRequests.delete(message.id);
        }
        // Notify consumers that settings have been updated
        this.updateWebSocketContext();

        // Also dispatch a custom event for more reliable delivery
        this.dispatchEvent(
          new CustomEvent("settings-updated", {
            detail: {
              requestId: message.id,
              timestamp: Date.now(),
            },
            bubbles: true,
            composed: true,
          }),
        );
        break;
      }

      case "COMMAND_EXECUTING": {
        const commandData = message.data as { commandID: string };
        if (commandData?.commandID) {
          // Clean up the pending request tracking
          if (message.id) {
            this._pendingCommandRequests.delete(message.id);
          }

          // Cancel any existing cleanup timeout for this command
          const existingTimeout = this._commandExecutionCleanupTimeouts.get(
            commandData.commandID,
          );
          if (existingTimeout !== undefined) {
            clearTimeout(existingTimeout);
            this._commandExecutionCleanupTimeouts.delete(commandData.commandID);
          }

          // Enforce size limit before adding new entry
          this.enforceCommandExecutionsLimit();

          // Set new execution state
          this._commandExecutions.set(commandData.commandID, {
            isExecuting: true,
            result: null,
          });
          this.requestUpdate();
        }
        break;
      }

      case "COMMAND_COMPLETED": {
        const result = message.data as {
          commandID: string;
          exitCode: number;
          stdout: string;
          stderr: string;
          error?: string;
        };
        if (result?.commandID) {
          // Clean up the pending request tracking
          if (message.id) {
            this._pendingCommandRequests.delete(message.id);
          }

          // Cancel any existing cleanup timeout for this command
          const existingTimeout = this._commandExecutionCleanupTimeouts.get(
            result.commandID,
          );
          if (existingTimeout !== undefined) {
            clearTimeout(existingTimeout);
            this._commandExecutionCleanupTimeouts.delete(result.commandID);
          }

          // Enforce size limit before adding new entry
          this.enforceCommandExecutionsLimit();

          // Set completed state
          this._commandExecutions.set(result.commandID, {
            isExecuting: false,
            result,
          });
          this.requestUpdate();

          // Schedule cleanup after 5 minutes to allow users to see results
          const cleanupTimeout = window.setTimeout(
            () => {
              this._commandExecutions.delete(result.commandID);
              this._commandExecutionCleanupTimeouts.delete(result.commandID);
              this.requestUpdate();
            },
            5 * 60 * 1000,
          ); // 5 minutes

          this._commandExecutionCleanupTimeouts.set(
            result.commandID,
            cleanupTimeout,
          );
        }
        break;
      }

      case "ERROR":
        if (message.subtype === "BAD_TOKEN") {
          this._error =
            "Invalid API token. Please check your connection settings and update your token.";
          this._isConnected = false;
          this._retryCount = MAX_RETRIES + 1;
          this._ws?.close();
          return;
        } else {
          const errorMessage = message.message ?? "Unknown error";
          this._error = `Server error: ${errorMessage}`;

          // Check if this error is for a pending UPDATE_SETTINGS request
          if (this._pendingSettingsRequests.has(message.id)) {
            // Clear any existing error timeout
            if (this._settingsErrorTimeout !== null) {
              clearTimeout(this._settingsErrorTimeout);
            }

            // Clear the settings update timeout to prevent it from firing
            this._isSettingsUpdatePending = false;
            if (this._settingsUpdateTimeout) {
              clearTimeout(this._settingsUpdateTimeout);
              this._settingsUpdateTimeout = null;
            }

            // Set the error
            this._settingsUpdateError = {
              requestId: message.id,
              message: errorMessage,
              timestamp: Date.now(),
            };

            // Clear the pending request
            this._pendingSettingsRequests.delete(message.id);

            // Dispatch a custom event to directly notify consumers
            // This bypasses the Lit context system for more reliable delivery
            this.dispatchEvent(
              new CustomEvent("settings-update-error", {
                detail: {
                  requestId: message.id,
                  message: errorMessage,
                  timestamp: Date.now(),
                },
                bubbles: true,
                composed: true,
              }),
            );

            // Clear the error after 10 seconds
            this._settingsErrorTimeout = window.setTimeout(() => {
              this._settingsUpdateError = null;
              this._settingsErrorTimeout = null;
              this.updateWebSocketContext();
            }, 10000);

            this.requestUpdate();
          }

          // Handle command execution errors
          if (
            message.subtype === "COMMAND_NOT_FOUND" ||
            message.subtype === "BAD_PATH" ||
            message.subtype === "BAD_DIRECTORY" ||
            message.subtype === "BAD_REQUEST"
          ) {
            // Check if this error is for a pending command execution
            const commandId = this._pendingCommandRequests.get(message.id);
            if (commandId) {
              // Cancel any existing cleanup timeout for this command
              const existingTimeout =
                this._commandExecutionCleanupTimeouts.get(commandId);
              if (existingTimeout !== undefined) {
                clearTimeout(existingTimeout);
                this._commandExecutionCleanupTimeouts.delete(commandId);
              }

              // Enforce size limit before adding new entry
              this.enforceCommandExecutionsLimit();

              // Set error result
              this._commandExecutions.set(commandId, {
                isExecuting: false,
                result: {
                  commandID: commandId,
                  exitCode: 1,
                  stdout: "",
                  stderr: "",
                  error: errorMessage,
                },
              });
              this.requestUpdate();

              // Schedule cleanup after 5 minutes
              const cleanupTimeout = window.setTimeout(
                () => {
                  this._commandExecutions.delete(commandId);
                  this._commandExecutionCleanupTimeouts.delete(commandId);
                  this.requestUpdate();
                },
                5 * 60 * 1000,
              );

              this._commandExecutionCleanupTimeouts.set(
                commandId,
                cleanupTimeout,
              );

              // Clean up the pending request tracking
              this._pendingCommandRequests.delete(message.id);
            }
          }
        }
        break;

      default:
        break;
    }

    this.requestUpdate();
  }

  private connect() {
    // Guard against undefined connection (context not yet provided)
    if (!this.connection) {
      return;
    }

    if (this._ws) {
      return;
    }

    // Use Effect-based connection with retry
    void this.connectWithEffect();
  }

  private async connectWithEffect() {
    if (!this.connection) return;

    try {
      const ws = await runPromise(
        connectWithRetry(
          this.connection,
          MAX_RETRIES,
          Duration.millis(RETRY_DELAY),
        ),
      );

      this._ws = ws;
      this._isConnected = true;
      this._error = null;
      this._retryCount = 0;

      if (this._reconnectTimeout) {
        clearTimeout(this._reconnectTimeout);
        this._reconnectTimeout = null;
      }

      this._previousConnectedState = true;

      // Set up message handlers
      ws.onmessage = this.handleMessage.bind(this);
      ws.onclose = this.handleClose.bind(this);
      ws.onerror = this.handleSocketError.bind(this);

      // Request initial data
      this.requestInitialData();

      this.requestUpdate();
    } catch (error) {
      /* eslint-disable @typescript-eslint/naming-convention */
      matchError(error, {
        ConnectionError: (e) => {
          this._error =
            e.message || "Connection failed. Please check your settings.";
        },
        TokenError: (e) => {
          this._error = e.message || "API token required.";
          this._retryCount = MAX_RETRIES + 1; // Don't retry token errors
        },
        TimeoutError: () => {
          this._error =
            "Connection timeout. Please check your host, port, and network connection.";
        },
        Unknown: (e) => {
          this._error = `Connection error: ${String(e)}`;
        },
      });
      /* eslint-enable @typescript-eslint/naming-convention */
      this._isConnected = false;
      this.requestUpdate();
    }
  }

  private handleClose(event: CloseEvent) {
    this._isConnected = false;
    this._ws = null;

    this.clearAllPendingResolvers("WebSocket connection closed");
    this.clearExecutingCommandsOnDisconnect();

    this._previousConnectedState = false;

    if (event.code === 1006) {
      this._error =
        "Connection closed unexpectedly. Please check your host and port settings.";
    } else if (event.code === 1002) {
      this._error = "Connection failed due to protocol error.";
    } else if (event.code === 1003) {
      this._error = "Invalid API token. Please check your connection settings.";
      this._retryCount = MAX_RETRIES + 1;
    } else if (event.code !== 1000 && event.code !== 1001) {
      this._error = `Connection closed with code ${event.code}: ${event.reason || "Unknown reason"}`;
    }

    this.requestUpdate();
    this.scheduleReconnect();
  }

  private handleSocketError() {
    this._isConnected = false;

    this.clearAllPendingResolvers("WebSocket connection error");
    this.clearExecutingCommandsOnDisconnect();

    if (this._retryCount === 0) {
      this._error =
        "Connection failed. Please check your host, port, and network connection.";
    }

    this.requestUpdate();
  }

  private requestInitialData() {
    if (!this.connection?.token || this._isRequestingData) return;

    this._isRequestingData = true;
    const { token } = this.connection;

    this.sendRequest({
      id: generateUUID(),
      event: "GET_SETTINGS",
      token: token,
    });

    this.sendRequest({
      id: generateUUID(),
      event: "GET_DATA",
      data: { modules: Modules },
      token: token,
    });

    this.sendRequest({
      id: generateUUID(),
      event: "REGISTER_DATA_LISTENER",
      data: { modules: Modules },
      token: token,
    });
  }

  private scheduleReconnect() {
    // Guard against undefined connection (context not yet provided)
    if (!this.connection) return;

    const { host, port, token } = this.connection;

    if (!host || !port || !token) {
      // Don't attempt reconnect if settings are incomplete
      return;
    }
    if (this._isConnected) return;

    if (this._reconnectTimeout) {
      clearTimeout(this._reconnectTimeout);
    }

    this._reconnectTimeout = window.setTimeout(() => {
      if (this._retryCount < MAX_RETRIES) {
        this._retryCount++;
        this._ws = null;
        this.connect();
      } else {
        this._error = `Failed to connect after ${MAX_RETRIES} attempts. Please check your connection settings and try again.`;
        this.requestUpdate();
      }
    }, RETRY_DELAY);
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

    if (request.event === "UPDATE_SETTINGS") {
      this._isSettingsUpdatePending = true;
      const requestId = request.id;
      if (requestId) {
        this._pendingSettingsRequests.add(requestId);
      }
      if (this._settingsUpdateTimeout) {
        clearTimeout(this._settingsUpdateTimeout);
      }
      this._settingsUpdateTimeout = window.setTimeout(() => {
        this._isSettingsUpdatePending = false;
        // Clean up stale pending request to prevent memory leak
        if (requestId) {
          this._pendingSettingsRequests.delete(requestId);
        }
        this._error =
          "Settings update timed out. Please try again or check your connection.";
        this.requestUpdate();
      }, UPDATE_TIMEOUT);
    }

    this._ws.send(JSON.stringify(request));
  }

  sendRequestWithResponse<T>(
    request: WebSocketRequest,
    schema: Schema.Schema<T>,
  ): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      if (this._ws?.readyState !== WebSocket.OPEN) {
        reject(new Error("WebSocket is not connected"));
        return;
      }
      if (!request.id) {
        reject(new Error("Request must have an id"));
        return;
      }

      const timeoutId = window.setTimeout(() => {
        if (this._pendingResolvers.has(request.id)) {
          this._pendingResolvers.delete(request.id);
          reject(new Error("WebSocket response timed out"));
        }
      }, UPDATE_TIMEOUT);

      this._pendingResolvers.set(request.id, {
        resolve: resolve as (value: unknown) => void,
        reject,
        schema,
        timeoutId,
      });

      try {
        this._ws.send(JSON.stringify(request));
      } catch (e) {
        clearTimeout(timeoutId);
        this._pendingResolvers.delete(request.id);
        reject(e instanceof Error ? e : new Error("Unknown error"));
      }
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
    if (this._ws) {
      this._ws.close();
      this._ws = null;
    }
    if (this._reconnectTimeout) {
      clearTimeout(this._reconnectTimeout);
      this._reconnectTimeout = null;
    }
    if (this._settingsUpdateTimeout) {
      clearTimeout(this._settingsUpdateTimeout);
      this._settingsUpdateTimeout = null;
    }
    if (this._settingsErrorTimeout !== null) {
      clearTimeout(this._settingsErrorTimeout);
      this._settingsErrorTimeout = null;
    }
    // Clean up all command execution timeouts
    for (const timeoutId of this._commandExecutionCleanupTimeouts.values()) {
      clearTimeout(timeoutId);
    }
    this._commandExecutionCleanupTimeouts.clear();
    this._commandExecutions.clear();
    this._pendingCommandRequests.clear();
    this._pendingSettingsRequests.clear();
    this.clearAllPendingResolvers("WebSocket provider disconnected");
  }

  render() {
    // In Light DOM, content passes through naturally
    return html``;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "websocket-provider": WebSocketProvider;
  }
}
