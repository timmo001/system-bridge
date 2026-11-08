import { mdiContentCopy, mdiOpenInNew } from "@mdi/js";
import "@timmo001/groundwork-ui/define/gw-alert.ts";
import "@timmo001/groundwork-ui/define/gw-button.ts";
import "@timmo001/groundwork-ui/define/gw-dialog.ts";
import type { Share } from "@timmo001/groundwork-pwa/view";
import { css, html, LitElement, nothing } from "lit";
import { customElement, state } from "lit/decorators.js";

import { AtomController } from "~/controllers/atom-controller";
import { actionResult, open, registry, setClipboard } from "~/lib/atoms";
import { pendingShare } from "~/lib/mobile";

/** The link a share carries, in its URL or as its whole text. */
const sharedUrl = (share: Share): string | undefined => {
  const candidate = share.url ?? share.text?.trim();

  return candidate !== undefined &&
    URL.canParse(candidate) &&
    /^https?:/.test(candidate)
    ? candidate
    : undefined;
};

/**
 * What to do with something shared from another app: open a link on the
 * computer, or put text on its clipboard. It opens while a share waits.
 */
@customElement("sb-share-dialog")
export class SbShareDialog extends LitElement {
  static override styles = css`
    p {
      margin: 0 0 var(--gw-space-3);
      overflow-wrap: anywhere;
    }
  `;

  readonly #share = new AtomController(this, () => pendingShare);

  readonly #open = new AtomController(this, () => open);

  readonly #copy = new AtomController(this, () => setClipboard);

  /** Which action this share ran, so only its result shows. */
  @state() private ran: "open" | "copy" | undefined;

  #close = () => {
    this.ran = undefined;
    registry.set(pendingShare, null);
  };

  #onOpen = () => {
    const share = this.#share.value;
    const url = share === null ? undefined : sharedUrl(share);

    if (url === undefined) return;

    this.ran = "open";
    registry.set(open, { url });
  };

  #onCopy = () => {
    const share = this.#share.value;
    const text = share?.text ?? share?.url;

    if (text === undefined) return;

    this.ran = "copy";
    registry.set(setClipboard, text);
  };

  override render() {
    const share = this.#share.value;

    if (share === null) return nothing;

    const url = sharedUrl(share);
    const text = share.text ?? share.url ?? "";

    const result =
      this.ran === "open"
        ? actionResult(this.#open.value, "Opened on the computer.")
        : this.ran === "copy"
          ? actionResult(
              this.#copy.value,
              "Copied to the computer's clipboard.",
            )
          : null;

    const busy =
      (this.ran === "open" && this.#open.value.waiting) ||
      (this.ran === "copy" && this.#copy.value.waiting);

    return html`
      <gw-dialog heading="Send to the computer" open @close=${this.#close}>
        <p>${share.title === undefined ? text : `${share.title}: ${text}`}</p>
        ${
          result === null
            ? nothing
            : html`<gw-alert
                tone=${result.success ? "success" : "danger"}
                heading=${result.success ? "Done" : "That didn't work"}
                >${result.message}</gw-alert
              >`
        }
        ${
          url === undefined
            ? nothing
            : html`<gw-button
                slot="actions"
                appearance=${text === url ? "filled" : "outlined"}
                icon=${mdiOpenInNew}
                ?loading=${busy && this.ran === "open"}
                @click=${this.#onOpen}
                >Open on the computer</gw-button
              >`
        }
        ${
          text === ""
            ? nothing
            : html`<gw-button
                slot="actions"
                appearance=${url === undefined ? "filled" : "outlined"}
                icon=${mdiContentCopy}
                ?loading=${busy && this.ran === "copy"}
                @click=${this.#onCopy}
                >Copy to the computer's clipboard</gw-button
              >`
        }
      </gw-dialog>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "sb-share-dialog": SbShareDialog;
  }
}
