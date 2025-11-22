import { LitElement, html } from "lit";
import { customElement } from "lit/decorators.js";
import { Router } from "@vaadin/router";
import "./components/theme-provider";
import "./components/connection-provider";
import "./components/websocket-provider";

@customElement("app-root")
export class App extends LitElement {
  protected createRenderRoot() {
    return this;
  }

  firstUpdated() {
    const outlet = this.querySelector("#outlet");
    if (!outlet) return;

    const router = new Router(outlet);
    router.setRoutes([
      {
        path: "/",
        component: "page-home",
        action: async () => {
          await import("./pages/home");
        },
      },
      {
        path: "/connection",
        component: "page-connection",
        action: async () => {
          await import("./pages/connection");
        },
      },
      {
        path: "/data",
        component: "page-data",
        action: async () => {
          await import("./pages/data");
        },
      },
      {
        path: "/settings",
        component: "page-settings",
        action: async () => {
          await import("./pages/settings");
        },
      },
    ]);
  }

  render() {
    return html`
      <theme-provider>
        <connection-provider>
          <websocket-provider>
            <div id="outlet"></div>
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
