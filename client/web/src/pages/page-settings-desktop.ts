import { mdiApplicationOutline } from "@mdi/js";
import type { Settings } from "@timmo001/effect-system-bridge";
import { Struct } from "effect";
import { html } from "lit";
import { customElement, state } from "lit/decorators.js";

import "~/components/sb-card";

import { SbSettingsPage } from "./sb-settings-page";

const placeholder = html`<span
  class="skeleton"
  style="min-height: 6rem; border-radius: var(--sb-radius-l)"
></span>`;

/** Whether the Desktop module reports window titles and runs Hyprland code. */
@customElement("page-settings-desktop")
export class PageSettingsDesktop extends SbSettingsPage {
  @state() private titles = false;

  @state() private hyprlandCode = false;

  protected readonly pageTitle = "Desktop";

  protected settingsLoaded(settings: Settings): void {
    this.titles = settings.desktop.windowTitles;
    this.hyprlandCode = settings.desktop.hyprlandCode;
  }

  #save() {
    const current = this.settings;

    if (current === undefined) {
      return;
    }

    this.saveSettings(
      Struct.assign(current, {
        desktop: {
          windowTitles: this.titles,
          hyprlandCode: this.hyprlandCode,
        },
      }),
    );
  }

  #onTitlesChange = (event: Event) => {
    if (!(event.target instanceof HTMLInputElement)) {
      return;
    }

    this.titles = event.target.checked;
    this.#save();
  };

  #onHyprlandCodeChange = (event: Event) => {
    if (!(event.target instanceof HTMLInputElement)) {
      return;
    }

    this.hyprlandCode = event.target.checked;
    this.#save();
  };

  #renderContent() {
    return html`
      <sb-card>
        <label class="setting">
          <span class="stack" style="--sb-stack-gap: 0">
            <span class="label" id="window-titles-label"
              >Report window titles</span
            >
            <span class="hint" id="window-titles-hint"
              >Titles can show private things, such as the page or document you
              have open, so they're off unless you turn them on.</span
            >
          </span>
          <input
            class="switch"
            type="checkbox"
            role="switch"
            aria-labelledby="window-titles-label"
            aria-describedby="window-titles-hint"
            .checked=${this.titles}
            ?disabled=${this.isSaving}
            @change=${this.#onTitlesChange}
          />
        </label>
        <label class="setting">
          <span class="stack" style="--sb-stack-gap: 0">
            <span class="label" id="hyprland-code-label"
              >Run commands, dispatches and Lua through Hyprland</span
            >
            <span class="hint" id="hyprland-code-hint"
              >Lets clients run any command, dispatch or line of Lua in
              Hyprland, so it's off unless you turn it on.</span
            >
          </span>
          <input
            class="switch"
            type="checkbox"
            role="switch"
            aria-labelledby="hyprland-code-label"
            aria-describedby="hyprland-code-hint"
            .checked=${this.hyprlandCode}
            ?disabled=${this.isSaving}
            @change=${this.#onHyprlandCodeChange}
          />
        </label>
      </sb-card>
    `;
  }

  override render() {
    return html`
      <div class="page narrow">
        ${this.renderHeader({
          heading: "Desktop",
          description:
            "Choose whether windows' titles are reported and Hyprland code runs",
          icon: mdiApplicationOutline,
        })}
        ${this.renderResult(this.saveResult)}
        ${this.gate(() => this.#renderContent(), placeholder)}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "page-settings-desktop": PageSettingsDesktop;
  }
}
