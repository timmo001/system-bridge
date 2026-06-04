import { provide } from "@lit/context";
import type { PropertyValues } from "lit";
import { customElement, state } from "lit/decorators.js";

import {
  bridgeSettingsContext,
  type BridgeSettingsState,
} from "~/contexts/bridge-settings";
import {
  connectionContext,
  type ConnectionSettings,
  loadConnectionSettings,
  saveConnectionSettings,
} from "~/contexts/connection";
import {
  connectionStatusContext,
  type ConnectionStatus,
} from "~/contexts/connection-status";
import { moduleDataContext } from "~/contexts/module-data";
import {
  themeContext,
  type ThemeState,
  type Theme,
  loadTheme,
  saveTheme,
  getEffectiveTheme,
  applyTheme,
} from "~/contexts/theme";
import {
  websocketActionsContext,
  type WebSocketActions,
} from "~/contexts/websocket-actions";
import { WebSocketController } from "~/controllers/websocket-controller";
import {
  DefaultModuleData,
  type ModuleData,
} from "~/lib/system-bridge/types-modules";
import { UIElement } from "~/mixins/light-dom";

@customElement("app-provider")
class AppProvider extends UIElement {
  @state()
  private _theme: Theme = "system";

  @state()
  private _connection: ConnectionSettings = loadConnectionSettings();

  @state()
  private _connectionStatus: ConnectionStatus = {
    isConnected: false,
    error: null,
    retryConnection: () => this._websocket.retryConnection(),
  };

  @state()
  private _moduleData: ModuleData = DefaultModuleData;

  @state()
  private _bridgeSettings: BridgeSettingsState = {
    settings: null,
    settingsUpdateError: null,
    commandExecutions: new Map(),
  };

  private readonly _websocket = new WebSocketController(
    this,
    this._connection,
    () => this.syncWebSocketContexts(),
  );

  private readonly _mediaQuery = window.matchMedia(
    "(prefers-color-scheme: dark)",
  );

  private _commandExecutionsVersion = -1;

  @provide({ context: themeContext })
  get themeState(): ThemeState {
    return {
      theme: this._theme,
      setTheme: this.setTheme,
    };
  }

  @provide({ context: connectionContext })
  get connectionSettings(): ConnectionSettings {
    return this._connection;
  }

  @provide({ context: connectionStatusContext })
  get connectionStatus(): ConnectionStatus {
    return this._connectionStatus;
  }

  @provide({ context: moduleDataContext })
  get moduleData(): ModuleData {
    return this._moduleData;
  }

  @provide({ context: bridgeSettingsContext })
  get bridgeSettings(): BridgeSettingsState {
    return this._bridgeSettings;
  }

  @provide({ context: websocketActionsContext })
  get websocketActions(): WebSocketActions {
    return this._websocket.actions;
  }

  connectedCallback() {
    super.connectedCallback();
    this._theme = loadTheme();
    this.applyCurrentTheme();
    this._mediaQuery.addEventListener(
      "change",
      this.handleThemePreferenceChange,
    );
    this.addEventListener("connection-updated", this.handleConnectionUpdated);
    this.syncWebSocketContexts();
  }

  disconnectedCallback() {
    this._mediaQuery.removeEventListener(
      "change",
      this.handleThemePreferenceChange,
    );
    this.removeEventListener(
      "connection-updated",
      this.handleConnectionUpdated,
    );
    super.disconnectedCallback();
  }

  protected updated(changedProperties: PropertyValues) {
    if (changedProperties.has("_theme")) {
      this.applyCurrentTheme();
    }
  }

  private readonly setTheme = (theme: Theme): void => {
    this._theme = theme;
    saveTheme(theme);
  };

  private readonly handleThemePreferenceChange = (): void => {
    if (this._theme === "system") {
      this.applyCurrentTheme();
    }
  };

  private applyCurrentTheme(): void {
    applyTheme(getEffectiveTheme(this._theme));
  }

  private readonly handleConnectionUpdated = (event: Event): void => {
    const { detail } = event as CustomEvent<ConnectionSettings>;
    this._connection = detail;
    saveConnectionSettings(detail);
    this._websocket.setConnection(detail);
  };

  private readonly syncWebSocketContexts = (): void => {
    const status = this._websocket.status;
    if (
      status.isConnected !== this._connectionStatus.isConnected ||
      status.error !== this._connectionStatus.error ||
      status.retryConnection !== this._connectionStatus.retryConnection
    ) {
      this._connectionStatus = status;
    }

    const data = this._websocket.data;
    if (data !== this._moduleData) {
      this._moduleData = data;
    }

    const bridgeSettings = this._websocket.bridgeSettings;
    const commandExecutionsVersion = this._websocket.commandExecutionsVersion;
    if (
      bridgeSettings.settings !== this._bridgeSettings.settings ||
      bridgeSettings.settingsUpdateError !==
        this._bridgeSettings.settingsUpdateError ||
      commandExecutionsVersion !== this._commandExecutionsVersion
    ) {
      this._bridgeSettings = bridgeSettings;
      this._commandExecutionsVersion = commandExecutionsVersion;
    }
  };
}

declare global {
  interface HTMLElementTagNameMap {
    "app-provider": AppProvider;
  }
}
