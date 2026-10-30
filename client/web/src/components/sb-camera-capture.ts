import { mdiCamera, mdiDownload } from "@mdi/js";
import type { Camera } from "@timmo001/effect-system-bridge";
import { Option } from "effect";
import { AsyncResult } from "effect/reactivity";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property } from "lit/decorators.js";

import "./sb-action-button";
import { icon, shared } from "./shared-styles";
import { AtomController } from "~/controllers/atom-controller";
import { cameraCapture, settings } from "~/lib/atoms";
import { href } from "~/lib/router";

/**
 * Takes a picture with a camera and shows it, when the setting allows it.
 * Points to the setting otherwise.
 */
@customElement("sb-camera-capture")
export class SbCameraCapture extends LitElement {
  static override styles = [
    shared,
    css`
      :host {
        display: flex;
        flex-direction: column;
        gap: var(--sb-space-3);
      }

      img {
        display: block;
        width: 100%;
        height: auto;
        border-radius: var(--sb-radius-m);
        background: var(--sb-color-sunken);
      }
    `,
  ];

  @property({ attribute: false }) camera: Camera | null = null;

  readonly #picture = new AtomController(this, () =>
    cameraCapture(this.camera?.id ?? ""),
  );

  readonly #settings = new AtomController(this, () => settings);

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
