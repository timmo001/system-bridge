import { ContextProvider } from "@lit/context";
import { html } from "lit";
import { customElement } from "lit/decorators.js";

import {
  connectionContext,
  type ConnectionSettings,
  loadConnectionSettings,
  saveConnectionSettings,
} from "~/contexts/connection";
import { ProviderElement } from "~/mixins";

@customElement("connection-provider")
export class ConnectionProvider extends ProviderElement {
  private _connection: ConnectionSettings;
  private _provider!: ContextProvider<typeof connectionContext>;

  get connection(): ConnectionSettings {
    return this._connection;
  }

  constructor() {
    super();
    this._connection = loadConnectionSettings();
    this._provider = new ContextProvider(this, {
      context: connectionContext,
    });
  }

  connectedCallback() {
    super.connectedCallback();
    this._provider.setValue(this._connection);
  }

  updateConnection(settings: Partial<ConnectionSettings>) {
    this._connection = { ...this._connection, ...settings };
    saveConnectionSettings(this._connection);
    this._provider.setValue(this._connection);
  }

  render() {
    // In Light DOM, content passes through naturally
    return html``;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "connection-provider": ConnectionProvider;
  }
}
