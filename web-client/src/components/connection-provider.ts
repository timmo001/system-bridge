import { provide } from "@lit/context";
import { html } from "lit";
import { customElement, state } from "lit/decorators.js";

import {
  connectionContext,
  type ConnectionSettings,
  loadConnectionSettings,
  saveConnectionSettings,
} from "~/contexts/connection";
import { ProviderElement } from "~/mixins";

@customElement("connection-provider")
export class ConnectionProvider extends ProviderElement {
  @state()
  private _connection: ConnectionSettings;

  @provide({ context: connectionContext })
  get connection(): ConnectionSettings {
    return this._connection;
  }

  constructor() {
    super();
    this._connection = loadConnectionSettings();
  }

  updateConnection(settings: Partial<ConnectionSettings>) {
    this._connection = { ...this._connection, ...settings };
    saveConnectionSettings(this._connection);
    this.requestUpdate();
  }

  render() {
    return html`<slot></slot>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "connection-provider": ConnectionProvider;
  }
}
