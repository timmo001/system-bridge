import type { Camera, CameraControl } from "@timmo001/effect-system-bridge";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property } from "lit/decorators.js";
import { live } from "lit/directives/live.js";

import "@timmo001/groundwork-ui/gw-checkbox.ts";
import "@timmo001/groundwork-ui/gw-range.ts";
import "@timmo001/groundwork-ui/gw-select.ts";
import "@timmo001/groundwork-ui/gw-setting-row.ts";
import { rangeTarget, selectValue } from "~/lib/select";
import { shared } from "./shared-styles";
import { AtomController } from "~/controllers/atom-controller";
import { actionResult, cameraControl, registry } from "~/lib/atoms";
import { formatNumber } from "~/lib/format";

/** One set of a camera's controls: sliders, switches and menus, by the kind of
 * value. */
@customElement("sb-camera-controls")
export class SbCameraControls extends LitElement {
  static override styles = [
    shared,
    css`
      :host {
        display: flex;
        flex-direction: column;
      }

      gw-setting-row {
        --gw-row-padding: var(--gw-space-2);
      }

      .level {
        display: flex;
        align-items: center;
        gap: var(--gw-space-3);
        width: min(18rem, 100%);
      }

      gw-range {
        flex: 1;
      }

      .level output {
        min-width: 5ch;
        white-space: nowrap;
        text-align: end;
      }

      gw-select {
        width: 14rem;
        min-width: 10rem;
      }
    `,
  ];

  @property({ attribute: false }) camera: Camera | null = null;

  /** The set of controls to show, such as User Controls. */
  @property() group = "";

  get #key() {
    return `${this.camera?.id ?? ""}\n${this.group}`;
  }

  readonly #control = new AtomController(this, () => cameraControl(this.#key));

  #set(control: string, value: number) {
    if (this.camera) {
      registry.set(cameraControl(this.#key), {
        id: this.camera.id,
        control,
        value,
      });
    }
  }

  /** Sends once let go, not on every step. */
  #onRange = (event: Event) => {
    const range = rangeTarget(event);

    if (range !== null) this.#set(range.name, range.value);
  };

  #onSwitch = (event: Event) => {
    const host = event.currentTarget;
    const input = event.target;

    if (host instanceof HTMLElement && input instanceof HTMLInputElement) {
      this.#set(host.dataset.control ?? "", input.checked ? 1 : 0);
    }
  };

  #onMenu = (event: Event) => {
    if (event.currentTarget instanceof HTMLElement) {
      this.#set(
        event.currentTarget.dataset.control ?? "",
        Number(selectValue(event)),
      );
    }
  };

  #renderInput(control: CameraControl, labelId: string, disabled: boolean) {
    switch (control.type) {
      case "boolean":
        return html`<gw-switch
          label=${control.name}
          label-hidden
          data-control=${control.id}
          .checked=${live(control.value !== 0)}
          ?disabled=${disabled}
          @change=${this.#onSwitch}
        ></gw-switch>`;
      case "menu": {
        const options = control.options.map((option) => ({
          value: String(option.value),
          label: option.name,
        }));

        return html`<gw-select
          label=${control.name}
          label-hidden
          data-control=${control.id}
          .options=${options}
          .value=${String(control.value)}
          ?disabled=${disabled}
          @change=${this.#onMenu}
        ></gw-select>`;
      }

      case "integer":
        return html`<div class="level">
          <gw-range
            id="${labelId}-input"
            label=${control.name}
            label-hidden
            name=${control.id}
            .min=${control.minimum}
            .max=${control.maximum}
            .step=${control.step}
            .value=${live(control.value)}
            ?disabled=${disabled}
            @change=${this.#onRange}
          ></gw-range>
          <output class="muted small tabular" for="${labelId}-input"
            >${formatNumber(control.value)}</output
          >
        </div>`;
    }
  }

  #renderControl(camera: Camera, control: CameraControl, waiting: boolean) {
    const labelId = `${camera.id}-${control.id}`;

    // Another control sets it, such as focus while autofocus is on
    const hint = control.read_only
      ? "Read only"
      : control.inactive
        ? "Set automatically"
        : null;

    return html`<gw-setting-row
      heading=${control.name}
      description=${hint ?? ""}
    >
      ${this.#renderInput(
        control,
        labelId,
        waiting || control.read_only || control.inactive,
      )}
    </gw-setting-row>`;
  }

  override render() {
    const camera = this.camera;

    if (!camera) return nothing;

    const waiting = this.#control.value.waiting;
    const result = actionResult(this.#control.value, "");

    const controls = camera.controls
      .filter((control) => control.group === this.group)
      .map((control) => this.#renderControl(camera, control, waiting));

    return html`
      ${controls}
      ${
        result?.success === false
          ? html`<span class="error-text" role="alert">${result.message}</span>`
          : nothing
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "sb-camera-controls": SbCameraControls;
  }
}
