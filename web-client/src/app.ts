import { Router } from "@lit-labs/router";
import { LitElement, html } from "lit";
import { customElement } from "lit/decorators.js";
import "./styles/globals.css";
import "./components/theme-provider";
import "./components/connection-provider";
import "./components/websocket-provider";

@customElement("app-root")
export class App extends LitElement {
  private router = new Router(this, [
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
      render: () => html`<page-settings-general></page-settings-general>`,
      enter: async () => {
        await import("./pages/settings-general");
        return true;
      },
    },
    {
      path: "/settings/media",
      render: () => html`<page-settings-media></page-settings-media>`,
      enter: async () => {
        await import("./pages/settings-media");
        return true;
      },
    },
    {
      path: "/settings/commands",
      render: () => html`<page-settings-commands></page-settings-commands>`,
      enter: async () => {
        await import("./pages/settings-commands");
        return true;
      },
    },
    {
      path: "/notifications",
      render: () => html`<page-notifications></page-notifications>`,
      enter: async () => {
        await import("./pages/notifications");
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
            <main>${this.router.outlet()}</main>
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
