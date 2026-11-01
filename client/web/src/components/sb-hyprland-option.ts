import type { HyprlandOption } from "@timmo001/effect-system-bridge";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property } from "lit/decorators.js";
import { live } from "lit/directives/live.js";

import "@timmo001/groundwork-ui/gw-segmented.ts";
import { selectValue } from "~/lib/select";
import { shared } from "./shared-styles";
import { AtomController } from "~/controllers/atom-controller";
import { actionResult, registry, setHyprlandOption } from "~/lib/atoms";

const toggleOptions = [
  { value: "on", label: "On" },
  { value: "off", label: "Off" },
] as const;

/** A Hyprland config option's switch, or field for a number. */
@customElement("sb-hyprland-option")
export class SbHyprlandOption extends LitElement {
  static override styles = [
    shared,
    css`
      :host {
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        gap: var(--gw-space-1);
      }

      .input {
        width: 7rem;
      }
    `,
  ];

  @property({ attribute: false }) option: HyprlandOption | null = null;

  readonly #set = new AtomController(this, () =>
    setHyprlandOption(this.option?.name ?? ""),
  );

  #onToggle = (event: Event) => {
    if (this.option) {
      registry.set(
        setHyprlandOption(this.option.name),
        selectValue(event) === "on",
      );
    }
  };

  /** Sends once the field is left or Enter is pressed, not on every key. */
  #onNumber = (event: Event) => {
    if (!(event.currentTarget instanceof HTMLInputElement) || !this.option) {
      return;
    }

    const value = event.currentTarget.valueAsNumber;

    if (Number.isInteger(value) && value >= 0) {
      registry.set(setHyprlandOption(this.option.name), value);
    }
  };

  override render() {
    const option = this.option;

    if (!option) return nothing;

    const result = actionResult(this.#set.value, "");

    return html`
      ${
        option.type === "bool"
          ? html`<gw-segmented
              label=${option.name}
              size="small"
              .options=${toggleOptions}
              .value=${option.bool ? "on" : "off"}
              @change=${this.#onToggle}
            ></gw-segmented>`
          : html`<input
              class="input"
              type="number"
              min="0"
              step="1"
              aria-label=${option.name}
              .value=${live(String(option.int ?? ""))}
              ?disabled=${this.#set.value.waiting}
              @change=${this.#onNumber}
            />`
      }
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
    "sb-hyprland-option": SbHyprlandOption;
  }
}
