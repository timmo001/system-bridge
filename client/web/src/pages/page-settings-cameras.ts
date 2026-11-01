import { mdiWebcam } from "@mdi/js";
import type { Settings } from "@timmo001/effect-system-bridge";
import { Struct } from "effect";
import { html } from "lit";
import { customElement, state } from "lit/decorators.js";

import "@timmo001/groundwork-ui/gw-card.ts";

import { SbSettingsPage } from "./sb-settings-page";

const placeholder = html`<gw-skeleton
  style="min-height: 6rem; border-radius: var(--gw-radius-l)"
></gw-skeleton>`;

/** Whether cameras can take pictures. */
@customElement("page-settings-cameras")
export class PageSettingsCameras extends SbSettingsPage {
  @state() private capture = false;

  protected readonly pageTitle = "Cameras";

  protected settingsLoaded(settings: Settings): void {
    this.capture = settings.cameras.capture;
  }

  #onCaptureChange = (event: Event) => {
    const current = this.settings;

    if (!(event.target instanceof HTMLInputElement) || current === undefined) {
      return;
    }

    this.capture = event.target.checked;
    this.saveSettings(
      Struct.assign(current, { cameras: { capture: this.capture } }),
    );
  };

  #renderContent() {
    return html`
      <gw-card level=${this.cardLevel}>
        <gw-setting-row
          heading="Take pictures"
          description="Lets clients take pictures with your cameras. A camera can see the room it's in, so it's off unless you turn it on."
        >
          <gw-switch
            label="Take pictures"
            label-hidden
            .checked=${this.capture}
            ?disabled=${this.isSaving}
            @change=${this.#onCaptureChange}
          ></gw-switch>
        </gw-setting-row>
      </gw-card>
    `;
  }

  override render() {
    return html`
      <div class="page narrow">
        ${this.renderHeader({
          heading: "Cameras",
          description: "Choose whether cameras can take pictures",
          icon: mdiWebcam,
        })}
        ${this.renderResult(this.saveResult)}
        ${this.gate(() => this.#renderContent(), placeholder)}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "page-settings-cameras": PageSettingsCameras;
  }
}
