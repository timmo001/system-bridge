import { mdiCamera, mdiDownload } from "@mdi/js";
import type { Camera, CameraSize } from "@timmo001/effect-system-bridge";
import { Option } from "effect";
import { AsyncResult } from "effect/reactivity";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property } from "lit/decorators.js";

import "./sb-action-button";
import "@timmo001/groundwork-ui/gw-select.ts";
import { selectValue } from "~/lib/select";
import { icon, shared } from "./shared-styles";
import { AtomController } from "~/controllers/atom-controller";
import {
  cameraCapture,
  cameraCaptureSize,
  registry,
  settings,
} from "~/lib/atoms";
import { href } from "~/lib/router";

const sizeLabel = (size: CameraSize) => `${size.width} × ${size.height}`;

/**
 * Takes a picture with a camera, at its current size or one of its others,
 * and shows it, when the setting allows it. Points to the setting otherwise.
 */
@customElement("sb-camera-capture")
export class SbCameraCapture extends LitElement {
  static override styles = [
    shared,
    css`
      :host {
        display: flex;
        flex-direction: column;
        gap: var(--gw-space-3);
      }

      gw-select {
        width: 14rem;
      }

      img {
        display: block;
        width: 100%;
        height: auto;
        border-radius: var(--gw-radius-m);
        background: var(--gw-color-surface-lower);
      }
    `,
  ];

  @property({ attribute: false }) camera: Camera | null = null;

  readonly #picture = new AtomController(this, () =>
    cameraCapture(this.camera?.id ?? ""),
  );

  readonly #settings = new AtomController(this, () => settings);

  readonly #size = new AtomController(this, () =>
    cameraCaptureSize(this.camera?.id ?? ""),
  );

  #onSize = (event: Event) => {
    const camera = this.camera;
    const value = selectValue(event);

    if (!camera) return;

    registry.set(
      cameraCaptureSize(camera.id),
      camera.sizes.find((size) => sizeLabel(size) === value) ?? null,
    );
  };

  #renderSize(camera: Camera) {
    if (camera.sizes.length === 0) return nothing;

    const options = camera.sizes.map((size) => ({
      value: sizeLabel(size),
      label: sizeLabel(size),
    }));

    // Until one is chosen, pictures are taken at the current size
    const size = this.#size.value ?? camera.format;

    return html`<gw-select
      label="Picture size"
      label-hidden
      .options=${options}
      .value=${size === null ? "" : sizeLabel(size)}
      @change=${this.#onSize}
    ></gw-select>`;
  }

  override render() {
    const camera = this.camera;

    if (!camera) return nothing;

    const allowed = Option.match(AsyncResult.value(this.#settings.value), {
      onNone: () => null,
      onSome: (current) => current.cameras.capture,
    });

    if (allowed === false) {
      return html`<span class="hint"
        >Taking pictures is off.
        <a
          href=${href("module", {
            params: { module: "cameras" },
            hash: "camera-capture",
          })}
          >Turn it on</a
        >
        to take one here.</span
      >`;
    }

    const picture = this.#picture.value;

    const source = AsyncResult.isSuccess(picture)
      ? `data:${picture.value.content_type};base64,${picture.value.image}`
      : null;

    return html`
      <div class="row wrap">
        ${this.#renderSize(camera)}
        <sb-action-button
          label="Take picture"
          .icon=${mdiCamera}
          .atom=${cameraCapture(camera.id)}
        ></sb-action-button>
        ${
          source === null
            ? nothing
            : html`<a
                class="button plain small"
                href=${source}
                download="${camera.id}.jpg"
                >${icon(mdiDownload)} Download</a
              >`
        }
      </div>
      ${
        source === null
          ? nothing
          : html`<img
              src=${source}
              alt="The last picture from ${camera.name}"
            />`
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "sb-camera-capture": SbCameraCapture;
  }
}
