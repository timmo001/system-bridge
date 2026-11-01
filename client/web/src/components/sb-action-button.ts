import { css, html, LitElement, nothing } from "lit";
import { customElement, property } from "lit/decorators.js";
import { AsyncResult, Atom } from "effect/reactivity";

import "@timmo001/groundwork-ui/gw-button.ts";
import { shared } from "./shared-styles";
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
        gap: var(--gw-space-1);
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

    return html`
      <gw-button
        variant="neutral"
        appearance="plain"
        size="small"
        labels=${this.iconOnly ? "hide" : "show"}
        icon=${this.icon ?? ""}
        ?loading=${value.waiting}
        ?disabled=${this.atom === null}
        @click=${this.#onClick}
        >${this.label}</gw-button
      >
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
