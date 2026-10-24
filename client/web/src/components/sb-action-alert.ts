import { mdiAlertCircleOutline } from "@mdi/js";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property } from "lit/decorators.js";
import { Atom } from "effect/reactivity";

import { icon, shared } from "./shared-styles";
import { AtomController } from "~/controllers/atom-controller";

/** Read until the alert has failures to watch. */
const none = Atom.make((): readonly string[] => []);

/** Why the actions taken on the page failed, if any did. */
@customElement("sb-action-alert")
export class SbActionAlert extends LitElement {
  static override styles = [
    shared,
    css`
      /* Takes no room in the dashboard's grid until there's something to say */
      :host {
        display: contents;
      }

      .alert {
        grid-column: 1 / -1;
      }
    `,
  ];

  /** Why each failed action failed, such as `bluetoothFailures`. */
  @property({ attribute: false }) failures: Atom.Atom<
    readonly string[]
  > | null = null;

  readonly #failures = new AtomController(this, () => this.failures ?? none);

  override render() {
    const failures = this.#failures.value;

    if (failures.length === 0) return nothing;

    const messages = failures.map((message) => html`<div>${message}</div>`);

    return html`
      <div class="alert danger" role="alert">
        ${icon(mdiAlertCircleOutline)}
        <div>
          <strong>That didn't work</strong>
          ${messages}
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "sb-action-alert": SbActionAlert;
  }
}
