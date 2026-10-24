import {
  mdiBookOpenVariant,
  mdiThemeLightDark,
  mdiWeatherNight,
  mdiWeatherSunny,
} from "@mdi/js";
import { HotkeyController } from "@tanstack/lit-hotkeys";
import { Schema } from "effect";
import { css, html, LitElement } from "lit";
import { customElement, query } from "lit/decorators.js";

import "./styles/tokens.css";
import "./components/sb-segmented";
import "./components/sb-select";
import type { SbSelect, SelectOption } from "./components/sb-select";
import { icon, shared } from "./components/shared-styles";
import { AtomController } from "./controllers/atom-controller";
import { connectionSettings, connectionStatus, registry } from "./lib/atoms";
import { DOCS_URL } from "./lib/links";
import { type NavItem, navigation } from "./lib/navigation";
import { appearance, appliedTheme } from "./lib/preferences";
import { currentLocation, href, type Location, navigate } from "./lib/router";
import { ThemeMode } from "./lib/themes";
import "./pages/page-connection";
import "./pages/page-module";
import "./pages/page-not-found";
import "./pages/page-overview";
import "./pages/page-settings";
import "./pages/page-settings-appearance";

const isThemeMode = Schema.is(ThemeMode);

const modeOptions = [
  { value: "system", label: "System", icon: mdiThemeLightDark },
  { value: "dark", label: "Dark", icon: mdiWeatherNight },
  { value: "light", label: "Light", icon: mdiWeatherSunny },
] as const;

/**
 * Every page, for the select in the header, which is the app's navigation,
 * grouped by area.
 */
const jumpItems: readonly (NavItem & { readonly group: string })[] =
  navigation.flatMap((section) =>
    section.items.map((item) => ({ ...item, group: section.label || "Pages" })),
  );

const jumpOptions: readonly SelectOption[] = jumpItems.map((item) => ({
  value: item.href,
  label: item.label,
  icon: item.icon,
  group: item.group,
}));

const renderPage = (location: Location) => {
  switch (location.name) {
    case "overview":
      return html`<page-overview></page-overview>`;
    case "module":
      return html`<page-module .location=${location}></page-module>`;
    case "connection":
      return html`<page-connection></page-connection>`;
    case "settings":
      return html`<page-settings></page-settings>`;
    case "settingsAppearance":
      return html`<page-settings-appearance></page-settings-appearance>`;
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
        grid-template-rows: var(--sb-header-height) 1fr;
        min-height: 100dvh;
      }

      header {
        position: sticky;
        top: 0;
        z-index: 10;
        display: flex;
        align-items: center;
        gap: var(--sb-space-3);
        padding: 0 var(--sb-space-3) 0 var(--sb-space-2);
        background: color-mix(in oklab, var(--sb-color-bg) 85%, transparent);
        backdrop-filter: blur(12px);
        border-bottom: 1px solid var(--sb-color-border);
      }

      .brand {
        display: flex;
        align-items: center;
        gap: var(--sb-space-2);
        font-weight: var(--sb-font-weight-semibold);
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
        flex: 1 1 24rem;
        min-width: 0;
        max-width: 26rem;
        margin-inline-start: var(--sb-space-4);
        --sb-select-width: 26rem;
        --sb-select-max-height: min(36rem, 70dvh);
      }

      .status {
        text-decoration: none;
      }

      main {
        min-width: 0;
        padding: var(--sb-space-6) var(--sb-gutter) var(--sb-space-12);
      }

      @media (max-width: 64rem) {
        .jump {
          margin-inline-start: 0;
        }
      }

      @media (max-width: 40rem) {
        .brand span,
        .mode,
        .status .label {
          display: none;
        }
      }
    `,
  ];

  readonly #location = new AtomController(this, () => currentLocation);

  readonly #status = new AtomController(this, () => connectionStatus);

  readonly #settings = new AtomController(this, () => connectionSettings);

  readonly #appearance = new AtomController(this, () => appearance);

  // Read so the theme is applied, and follows changes
  readonly #theme = new AtomController(this, () => appliedTheme);

  @query(".jump") private jump?: SbSelect;

  constructor() {
    super();
    this.addController(
      new HotkeyController(this, "Mod+K", () => this.jump?.show(), {
        preventDefault: true,
      }),
    );
  }

  override willUpdate(): void {
    // Reading it keeps the theme atom mounted
    void this.#theme.value;
  }

  #onJump = (event: CustomEvent<{ readonly value: string }>) => {
    navigate(event.detail.value);
  };

  #onModeChange = (event: CustomEvent<{ readonly value: string }>) => {
    const mode = event.detail.value;

    if (isThemeMode(mode)) {
      registry.set(appearance, { ...this.#appearance.value, mode });
    }
  };

  #renderStatus() {
    const { isConnected, error } = this.#status.value;
    const { host, port } = this.#settings.value;

    const [kind, label] = isConnected
      ? ["success", `${host}:${port}`]
      : error === null
        ? ["warning", "Connecting"]
        : ["danger", "Disconnected"];

    return html`
      <a
        class="chip ${kind} status"
        href=${href("connection")}
        title=${error ?? (isConnected ? `Connected to ${host}:${port}` : "")}
      >
        <span class="dot"></span><span class="label">${label}</span>
      </a>
    `;
  }

  override render() {
    const location = this.#location.value;
    const current = this.#appearance.value;

    const active = jumpItems.find((item) => item.matches(location));

    return html`
      <header>
        <a class="brand" href=${href("overview")}>
          <img
            class="logo"
            src="${import.meta.env.BASE_URL}icon.svg"
            alt=""
            width="44"
            height="24"
          />
          <span>System Bridge</span>
        </a>
        <sb-select
          class="jump"
          label="Go to page"
          placeholder="Go to…"
          search-placeholder="Search pages"
          shortcut=${navigator.userAgent.includes("Mac") ? "⌘ K" : "Ctrl K"}
          .options=${jumpOptions}
          .value=${active?.href ?? ""}
          @value-changed=${this.#onJump}
        ></sb-select>
        <span class="spacer"></span>
        ${this.#renderStatus()}
        <sb-segmented
          class="mode"
          icons-only
          label="Colour scheme"
          .options=${modeOptions}
          .value=${current.mode}
          @value-changed=${this.#onModeChange}
        ></sb-segmented>
        <a
          class="button plain icon-only"
          href=${DOCS_URL}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Documentation"
          title="Documentation"
        >
          ${icon(mdiBookOpenVariant)}
        </a>
      </header>
      <main>${renderPage(location)}</main>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "sb-app": SbApp;
  }
}
