import "urlpattern-polyfill";
import { LitElement, html } from "lit";
import { customElement } from "lit/decorators.js";
import { Routes } from "@lit-labs/router";
import "./styles/globals.css";
import "./components/theme-provider";
import "./components/connection-provider";
import "./components/websocket-provider";

@customElement("app-root")
export class App extends LitElement {
  private routes = new Routes(this, [
    {
      path: "/",
      render: () => html`<page-home></page-home>`,
      enter: async () => {
        await import("./pages/home");
        return true;
      },
    },
    {
      path: "/connection",
      render: () => html`<page-connection></page-connection>`,
      enter: async () => {
        await import("./pages/connection");
        return true;
      },
    },
    {
      path: "/data",
      render: () => html`<page-data></page-data>`,
      enter: async () => {
        await import("./pages/data");
        return true;
      },
    },
    {
      path: "/settings",
      render: () => html`<page-settings></page-settings>`,
      enter: async () => {
        await import("./pages/settings");
        return true;
      },
    },
  ]);

  protected createRenderRoot() {
    return this;
  }

  render() {
    return html`
      <theme-provider>
        <connection-provider>
          <websocket-provider>
            <main>${this.routes.outlet()}</main>
          </websocket-provider>
        </connection-provider>
      </theme-provider>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "app-root": App;
  }
}
