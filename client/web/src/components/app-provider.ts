import { provide } from "@lit/context";
import type { PropertyValues } from "lit";
import { customElement, state } from "lit/decorators.js";

import {
  themeContext,
  type ThemeState,
  type Theme,
  loadTheme,
  saveTheme,
  getEffectiveTheme,
  applyTheme,
} from "~/contexts/theme";
import { UIElement } from "~/mixins/light-dom";

@customElement("app-provider")
class AppProvider extends UIElement {
  @state()
  private _theme: Theme = "system";

  @provide({ context: themeContext })
  themeState: ThemeState = {
    theme: this._theme,
    setTheme: (theme: Theme) => this.setTheme(theme),
  };

  private readonly _mediaQuery = window.matchMedia(
    "(prefers-color-scheme: dark)",
  );

  connectedCallback() {
    super.connectedCallback();
    this._theme = loadTheme();
    this.themeState = { ...this.themeState, theme: this._theme };
    this.applyCurrentTheme();
    this._mediaQuery.addEventListener(
      "change",
      this.handleThemePreferenceChange,
    );
  }

  disconnectedCallback() {
    this._mediaQuery.removeEventListener(
      "change",
      this.handleThemePreferenceChange,
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
    this.themeState = { ...this.themeState, theme };
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
}

declare global {
  interface HTMLElementTagNameMap {
    "app-provider": AppProvider;
  }
}
