import { mdiApplicationOutline } from "@mdi/js";
import type { Settings } from "@timmo001/effect-system-bridge";
import { Struct } from "effect";
import { html } from "lit";
import { customElement, state } from "lit/decorators.js";

import "@timmo001/groundwork-ui/gw-card.ts";

import { SbSettingsPage } from "./sb-settings-page";

const placeholder = html`<gw-skeleton
  style="min-height: 6rem; border-radius: var(--gw-radius-l)"
></gw-skeleton>`;

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
      <gw-card level=${this.cardLevel}>
        <gw-setting-row
          heading="Report window titles"
          description="Titles can show private things, such as the page or document you have open, so they're off unless you turn them on."
        >
          <gw-switch
            label="Report window titles"
            label-hidden
            .checked=${this.titles}
            ?disabled=${this.isSaving}
            @change=${this.#onTitlesChange}
          ></gw-switch>
        </gw-setting-row>
        <gw-setting-row
          heading="Run commands, dispatches and Lua through Hyprland"
          description="Lets clients run any command, dispatch or line of Lua in Hyprland, so it's off unless you turn it on."
        >
          <gw-switch
            label="Run commands, dispatches and Lua through Hyprland"
            label-hidden
            .checked=${this.hyprlandCode}
            ?disabled=${this.isSaving}
            @change=${this.#onHyprlandCodeChange}
          ></gw-switch>
        </gw-setting-row>
      </gw-card>
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
