import { mdiClose, mdiDotsHorizontal, mdiSkullOutline } from "@mdi/js";
import type { Process } from "@timmo001/effect-system-bridge";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property } from "lit/decorators.js";

import "@timmo001/groundwork-ui/gw-menu-button.ts";
import type { MenuItem } from "@timmo001/groundwork-ui/gw-menu-button.ts";
import { shared } from "./shared-styles";
import { AtomController } from "~/controllers/atom-controller";
import { actionResult, killProcess, registry } from "~/lib/atoms";
import { menuValue } from "~/lib/select";

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

  #onSelect = (event: Event) => {
    if (this.process) {
      registry.set(killProcess(this.process.id), menuValue(event) === "force");
    }
  };

  override render() {
    const process = this.process;

    if (!process) return nothing;

    const result = actionResult(this.#kill.value, "");

    return html`
      <gw-menu-button
        labels="hide"
        appearance="plain"
        size="small"
        label="Actions for ${process.name ?? process.id}"
        .icon=${mdiDotsHorizontal}
        ?loading=${this.#kill.value.waiting}
        .items=${items}
        @select=${this.#onSelect}
      ></gw-menu-button>
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
