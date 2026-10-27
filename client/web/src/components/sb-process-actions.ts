import { mdiClose, mdiDotsHorizontal, mdiSkullOutline } from "@mdi/js";
import type { Process } from "@timmo001/effect-system-bridge";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property } from "lit/decorators.js";

import "./sb-menu-button";
import type { MenuItem } from "./sb-menu-button";
import { shared } from "./shared-styles";
import { AtomController } from "~/controllers/atom-controller";
import { actionResult, killProcess, registry } from "~/lib/atoms";

const items: readonly MenuItem[] = [
  {
    value: "end",
    label: "End",
    description: "Asks it to stop, so it can save first",
    icon: mdiClose,
  },
  {
    value: "force",
    label: "Force end",
    description: "Ends it straight away, losing anything unsaved",
    icon: mdiSkullOutline,
  },
];

/** A menu to end a process, asking it to stop or forcing it. */
@customElement("sb-process-actions")
export class SbProcessActions extends LitElement {
  static override styles = [
    shared,
    css`
      :host {
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        gap: var(--sb-space-1);
      }
    `,
  ];

  @property({ attribute: false }) process: Process | null = null;

  readonly #kill = new AtomController(this, () =>
    killProcess(this.process?.id ?? 0),
  );

  #onSelect = (event: CustomEvent<{ readonly value: string }>) => {
    if (this.process) {
      registry.set(
        killProcess(this.process.id),
        event.detail.value === "force",
      );
    }
  };

  override render() {
    const process = this.process;

    if (!process) return nothing;

    const result = actionResult(this.#kill.value, "");

    return html`
      <sb-menu-button
        icon-only
        label="Actions for ${process.name ?? process.id}"
        .icon=${mdiDotsHorizontal}
        .busy=${this.#kill.value.waiting}
        .items=${items}
        @menu-select=${this.#onSelect}
      ></sb-menu-button>
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
    "sb-process-actions": SbProcessActions;
  }
}
