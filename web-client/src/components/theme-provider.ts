import { html } from "lit";
import { ProviderElement } from "~/mixins";
import { customElement, state } from "lit/decorators.js";
import { provide } from "@lit/context";
import {
  themeContext,
  type ThemeState,
  type Theme,
  loadTheme,
  saveTheme,
  getEffectiveTheme,
  applyTheme,
} from "~/contexts/theme";

@customElement("theme-provider")
export class ThemeProvider extends ProviderElement {
  @state()
  private _theme: Theme = "system";

  @provide({ context: themeContext })
  get themeState(): ThemeState {
    return {
      theme: this._theme,
      setTheme: this.setTheme.bind(this),
    };
  }

  connectedCallback() {
    super.connectedCallback();
    this._theme = loadTheme();
    this.applyCurrentTheme();
    this.setupMediaQueryListener();
  }

  private setTheme(theme: Theme) {
    this._theme = theme;
    saveTheme(theme);
    this.applyCurrentTheme();
    this.requestUpdate();
  }

  private applyCurrentTheme() {
    const effectiveTheme = getEffectiveTheme(this._theme);
    applyTheme(effectiveTheme);
  }

  private setupMediaQueryListener() {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    mediaQuery.addEventListener("change", () => {
      if (this._theme === "system") {
        this.applyCurrentTheme();
      }
    });
  }

  render() {
    return html`<slot></slot>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "theme-provider": ThemeProvider;
  }
}
