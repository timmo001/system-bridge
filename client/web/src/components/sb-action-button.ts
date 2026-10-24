import { css, html, LitElement, nothing } from "lit";
import { customElement, property } from "lit/decorators.js";
import { AsyncResult, Atom } from "effect/reactivity";

import { icon, shared, spinner } from "./shared-styles";
import { AtomController } from "~/controllers/atom-controller";
import { actionResult, type BridgeError, registry } from "~/lib/atoms";

/** An action atom that takes no argument. */
export type ActionAtom = Atom.Writable<
  AsyncResult.AsyncResult<unknown, BridgeError>,
  undefined
>;

/** Read until the button has an action. */
const idle = Atom.make(AsyncResult.initial<unknown, BridgeError>());

/** A button that runs an action, showing a spinner while it runs and why it failed. */
@customElement("sb-action-button")
export class SbActionButton extends LitElement {
  static override styles = [
    shared,
    css`
      :host {
        display: inline-flex;
        flex-direction: column;
        align-items: flex-start;
        gap: var(--sb-space-1);
      }
    `,
  ];

  @property({ attribute: false }) atom: ActionAtom | null = null;

  @property() label = "";

  /** An `@mdi/js` path shown before the label, or alone with `icon-only`. */
  @property({ attribute: false }) icon: string | undefined = undefined;

  /** Shows only the icon, keeping the label for assistive technology. */
  @property({ type: Boolean, attribute: "icon-only" }) iconOnly = false;

  /** Leaves out why it failed, for pages that show it in `sb-action-alert`. */
  @property({ type: Boolean }) quiet = false;

  readonly #result = new AtomController(this, () => this.atom ?? idle);

  #onClick = () => {
    if (this.atom) registry.set(this.atom, undefined);
  };

  override render() {
    const value = this.#result.value;

    const result = actionResult(value, "");

    const leading = value.waiting
      ? spinner()
      : this.icon === undefined
        ? nothing
        : icon(this.icon);

    return html`
      <button
        class="button plain small ${this.iconOnly ? "icon-only" : ""}"
        type="button"
        aria-label=${this.iconOnly ? this.label : nothing}
        title=${this.iconOnly ? this.label : nothing}
        aria-busy=${value.waiting ? "true" : "false"}
        ?disabled=${value.waiting || this.atom === null}
        @click=${this.#onClick}
      >
        ${leading} ${this.iconOnly ? nothing : this.label}
      </button>
      ${
        result?.success === false && !this.quiet
          ? html`<span class="error-text" role="alert">${result.message}</span>`
          : nothing
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "sb-action-button": SbActionButton;
  }
}
