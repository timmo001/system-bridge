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
        <label class="setting">
          <span class="stack" style="--sb-stack-gap: 0">
            <span class="label" id="camera-capture-label">Take pictures</span>
            <span class="hint" id="camera-capture-hint"
              >Lets clients take pictures with your cameras. A camera can see
              the room it's in, so it's off unless you turn it on.</span
            >
          </span>
          <input
            class="switch"
            type="checkbox"
            role="switch"
            aria-labelledby="camera-capture-label"
            aria-describedby="camera-capture-hint"
            .checked=${this.capture}
            ?disabled=${this.isSaving}
            @change=${this.#onCaptureChange}
          />
        </label>
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
