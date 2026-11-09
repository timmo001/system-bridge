import { mdiContentCopy, mdiOpenInNew } from "@mdi/js";
import "@timmo001/groundwork-ui/define/gw-alert.ts";
import "@timmo001/groundwork-ui/define/gw-button.ts";
import "@timmo001/groundwork-ui/define/gw-dialog.ts";
import "@timmo001/groundwork-ui/define/gw-select.ts";
import type { Share } from "@timmo001/groundwork-pwa/view";
import { Match } from "effect";
import { css, html, LitElement, nothing } from "lit";
import { customElement, state } from "lit/decorators.js";

import { AtomController } from "~/controllers/atom-controller";
import { actionResult, open, registry, setClipboard } from "~/lib/atoms";
import {
  type Computer,
  inApp,
  pairedComputers,
  pendingShare,
  setPendingShare,
  shareToComputer,
} from "~/lib/mobile";
import { selectValue } from "~/lib/select";

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
 * computer, or put text on its clipboard. It opens while a share waits, and
 * plain text goes straight to the clipboard, so it only shows how that went. In
 * the app, with more than one computer paired, it says which one the share
 * is for, and sends it on to another when picked.
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

  /** In the app, the paired computers, read when a share arrives. */
  @state() private computers: readonly Computer[] | undefined;

  protected override updated(): void {
    const share = this.#share.value;

    if (share === null) return;

    // Plain text goes straight to the computer's clipboard, and the dialog
    // shows how it went; a link asks whether to open or copy it
    if (
      this.ran === undefined &&
      sharedUrl(share) === undefined &&
      (share.text ?? "") !== ""
    ) {
      this.#onCopy();
    }

    if (!inApp || this.computers !== undefined) return;

    this.computers = [];
    void pairedComputers().then((computers) => {
      this.computers = computers;
    });
  }

  #close = () => {
    this.ran = undefined;
    this.computers = undefined;
    setPendingShare(null);
  };

  /** Another computer picked: the app opens it, and the share goes with it. */
  #onComputer = (event: Event) => {
    const share = this.#share.value;
    const id = selectValue(event);

    if (share === null || this.computers?.find((c) => c.id === id)?.current) {
      return;
    }

    void shareToComputer(id, share);
    this.#close();
  };

  /** Which computer the share goes to, and a choice of the others. */
  #renderComputers() {
    const computers = this.computers ?? [];

    if (computers.length < 2) return nothing;

    const options = computers.map((computer) => ({
      value: computer.id,
      label: computer.name,
    }));

    return html`<gw-select
      label="Send to"
      .options=${options}
      .value=${computers.find((computer) => computer.current)?.id ?? ""}
      @change=${this.#onComputer}
    ></gw-select>`;
  }

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

    const result = Match.value(this.ran).pipe(
      Match.when("open", () =>
        actionResult(this.#open.value, "Opened on the computer."),
      ),
      Match.when("copy", () =>
        actionResult(this.#copy.value, "Copied to the computer's clipboard."),
      ),
      Match.orElse(() => null),
    );

    const busy =
      (this.ran === "open" && this.#open.value.waiting) ||
      (this.ran === "copy" && this.#copy.value.waiting);

    return html`
      <gw-dialog heading="Send to the computer" open @close=${this.#close}>
        <p>${share.title === undefined ? text : `${share.title}: ${text}`}</p>
        ${this.#renderComputers()}
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
