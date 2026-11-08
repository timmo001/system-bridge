import "@timmo001/groundwork-ui/define/gw-app-bar.ts";
import "@timmo001/groundwork-ui/define/gw-button.ts";
import type { GwCommandMenu } from "@timmo001/groundwork-ui/gw-command-menu.ts";
import "@timmo001/groundwork-ui/define/gw-command-menu.ts";
import type { OptionItem } from "@timmo001/groundwork-ui/gw-option-list.ts";
import {
  mdiBookOpenVariant,
  mdiMagnify,
  mdiPaletteOutline,
  mdiServerNetwork,
} from "@mdi/js";
import { css, html, LitElement, nothing } from "lit";
import { customElement, query } from "lit/decorators.js";

import "./styles/tokens.css";
import "./components/sb-share-dialog";
import { icon, shared } from "./components/shared-styles";
import { AtomController } from "./controllers/atom-controller";
import { connectionSettings, connectionStatus } from "./lib/atoms";
import { DOCS_URL } from "./lib/links";
import { type NavItem, navigation } from "./lib/navigation";
import { currentLocation, href, type Location, navigate } from "./lib/router";
// Applies the stored theme and registers its WebMCP tools on every page
import "./lib/theme";
// Connects to the Android app's shell, or the PWA's pieces outside it
import { inApp, openComputers } from "./lib/mobile";
import { watchForUpdates } from "./lib/update";
import { registerPageTools } from "./lib/webmcp";
import "./pages/page-connection";
import "./pages/page-module";
import "./pages/page-not-found";
import "./pages/page-overview";
import "./pages/page-settings";
import "./pages/page-settings-appearance";
import "./pages/page-settings-devices";

/**
 * Every page, for the command menu in the header, which is the app's
 * navigation, grouped by area. The Android app keeps its computers' addresses
 * and tokens itself, so it has no connection page.
 */
const jumpItems: readonly (NavItem & { readonly group: string })[] =
  navigation.flatMap((section) =>
    section.items
      .filter((item) => !(inApp && item.href === href("connection")))
      .map((item) => ({ ...item, group: section.label || "Pages" })),
  );

const jumpOptions: readonly OptionItem[] = jumpItems.map((item) => ({
  value: item.href,
  label: item.label,
  icon: item.icon,
  group: item.group,
}));

registerPageTools();

watchForUpdates();

const renderPage = (location: Location) => {
  switch (location.name) {
    case "overview":
      return html`<page-overview></page-overview>`;
    case "module":
      return html`<page-module .location=${location}></page-module>`;
    case "connection":
      // In the app, its computers page stands in for it
      if (inApp) {
        openComputers();

        return nothing;
      }

      return html`<page-connection></page-connection>`;
    case "settings":
      return html`<page-settings></page-settings>`;
    case "settingsAppearance":
      return html`<page-settings-appearance></page-settings-appearance>`;
    case "settingsDevices":
      return html`<page-settings-devices></page-settings-devices>`;
    case "notFound":
      return html`<page-not-found .path=${location.path}></page-not-found>`;
  }
};

/**
 * The app: a header, whose searchable select is the navigation, and the page
 * the URL points at.
 */
@customElement("sb-app")
export class SbApp extends LitElement {
  static override styles = [
    shared,
    css`
      :host {
        display: grid;
        grid-template-columns: minmax(0, 1fr);
        grid-template-rows: auto 1fr;
        min-height: 100dvh;
      }

      gw-app-bar {
        --gw-content-width: var(--sb-content-width);
      }

      .brand {
        display: flex;
        align-items: center;
        gap: var(--gw-space-2);
        font-weight: var(--gw-font-weight-strong);
        color: inherit;
        text-decoration: none;
        white-space: nowrap;
      }

      /* The logo is wider than tall in a square image, so crop the space
         above and below it */
      .brand .logo {
        width: 2.75rem;
        height: 1.5rem;
        object-fit: cover;
      }

      .jump {
        display: flex;
        flex: 1 1 24rem;
        gap: var(--gw-space-2);
        align-items: center;
        min-width: 0;
        max-width: 26rem;
        height: 2.25rem;
        margin-inline: var(--gw-space-4) auto;
        padding: 0 var(--gw-space-2) 0 var(--gw-space-3);
        font: inherit;
        color: var(--gw-color-text-primary);
        text-align: start;
        cursor: pointer;
        background: var(--gw-color-surface-lower);
        border: 1px solid var(--gw-color-border-normal);
        border-radius: var(--gw-radius-m);
        transition: border-color var(--gw-motion-fast) var(--gw-motion-easing);
      }

      .jump:hover {
        border-color: var(--gw-color-border-loud);
      }

      .jump .current {
        flex: 1;
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      /* Phones rarely have a keyboard, and the page name needs the room */
      @media (width < 40rem) {
        .jump kbd {
          display: none;
        }
      }

      .status {
        display: inline-flex;
        border-radius: var(--gw-radius-chip);
        text-decoration: none;
      }

      main {
        min-width: 0;
        padding: var(--gw-space-6) var(--sb-gutter) var(--gw-space-12);
      }

      @media (max-width: 64rem) {
        .jump {
          margin-inline-start: 0;
        }
      }

      @media (max-width: 40rem) {
        .brand span,
        .status .label {
          display: none;
        }
      }
    `,
  ];

  readonly #location = new AtomController(this, () => currentLocation);

  readonly #status = new AtomController(this, () => connectionStatus);

  readonly #settings = new AtomController(this, () => connectionSettings);

  @query(".commands") private commands?: GwCommandMenu;

  #openCommands = () => {
    this.commands?.show();
  };

  #onJump = (event: CustomEvent<{ readonly value: string }>) => {
    navigate(event.detail.value);
  };

  /**
   * In the Android app, a button that opens the app's own computers page,
   * where they're opened, edited, removed and added.
   */
  #renderComputers() {
    if (!inApp) return nothing;

    return html`<gw-button
      slot="actions"
      variant="neutral"
      appearance="plain"
      labels="hide"
      icon=${mdiServerNetwork}
      @click=${openComputers}
      >Computers</gw-button
    >`;
  }

  /**
   * The connection's status, opening the connection page. Not in the app,
   * where its computers page does that, and a computer it can't reach gets
   * the app's offline page.
   */
  #renderStatus() {
    if (inApp) return nothing;

    const { isConnected, error } = this.#status.value;
    const { host, port } = this.#settings.value;

    const [kind, label] = isConnected
      ? ["success", `${host}:${port}`]
      : error === null
        ? ["warning", "Connecting"]
        : ["danger", "Disconnected"];

    return html`
      <a
        class="status"
        href=${href("connection")}
        title=${error ?? (isConnected ? `Connected to ${host}:${port}` : "")}
      >
        <gw-chip size="small" tone=${kind}
          ><gw-dot slot="icon" tone=${kind}></gw-dot
          ><span class="label">${label}</span></gw-chip
        >
      </a>
    `;
  }

  override render() {
    const location = this.#location.value;

    const active = jumpItems.find((item) => item.matches(location));

    return html`
      <gw-app-bar>
        <a slot="brand" class="brand" href=${href("overview")}>
          <img
            class="logo"
            src="${import.meta.env.BASE_URL}icon.svg"
            alt=""
            width="44"
            height="24"
          />
          <span>System Bridge</span>
        </a>
        <button
          slot="actions"
          class="jump"
          type="button"
          aria-haspopup="dialog"
          @click=${this.#openCommands}
        >
          ${icon(active?.icon ?? mdiMagnify)}
          <span class="current">${active?.label ?? "Go to…"}</span>
          <kbd>${navigator.userAgent.includes("Mac") ? "⌘ K" : "Ctrl K"}</kbd>
        </button>
        <gw-command-menu
          slot="actions"
          class="commands"
          label="Go to page"
          placeholder="Search pages"
          .options=${jumpOptions}
          value=${active?.href ?? ""}
          @pick=${this.#onJump}
        ></gw-command-menu>
        <span slot="actions">${this.#renderStatus()}</span>
        ${this.#renderComputers()}
        <gw-button
          slot="actions"
          variant="neutral"
          appearance="plain"
          labels="hide"
          icon=${mdiPaletteOutline}
          href=${href("settingsAppearance")}
          >Appearance</gw-button
        >
        <gw-button
          slot="actions"
          variant="neutral"
          appearance="plain"
          labels="hide"
          icon=${mdiBookOpenVariant}
          ><a href=${DOCS_URL} target="_blank" rel="noopener noreferrer"
            >Documentation</a
          ></gw-button
        >
      </gw-app-bar>
      <main>${renderPage(location)}</main>
      <sb-share-dialog></sb-share-dialog>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "sb-app": SbApp;
  }
}
