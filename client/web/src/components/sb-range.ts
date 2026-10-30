import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { styleMap } from "lit/directives/style-map.js";

import { formatPercent } from "~/lib/format";

/**
 * Wraps a range input, showing its value above the thumb while it's pressed or
 * dragged.
 */
@customElement("sb-range")
export class SbRange extends LitElement {
  static override styles = css`
    :host {
      --sb-range-thumb: 1rem;

      position: relative;
      display: block;
      flex: 1;
      min-width: 0;
    }

    ::slotted(input) {
      display: block;
      width: 100%;
      margin: 0;
    }

    .bubble {
      position: absolute;
      bottom: calc(100% + var(--sb-space-1));
      padding: var(--sb-space-1) var(--sb-space-2);
      border-radius: var(--sb-radius-s);
      background: var(--sb-color-accent);
      box-shadow: var(--sb-shadow-s);
      color: var(--sb-color-on-accent);
      font-size: var(--sb-font-size-xs);
      font-variant-numeric: tabular-nums;
      white-space: nowrap;
      pointer-events: none;
      transform: translateX(-50%);
    }
  `;

  /** The value's unit, shown after it, or nothing for a plain number. */
  @property() unit = "%";

  @state() private input: HTMLInputElement | null = null;

  @state() private active = false;

  override connectedCallback() {
    super.connectedCallback();
    this.addEventListener("pointerdown", this.#onPointerDown);
    this.addEventListener("input", this.#onInput);
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    this.removeEventListener("pointerdown", this.#onPointerDown);
    this.removeEventListener("input", this.#onInput);
    this.#onPointerUp();
  }

  #onSlotChange = (event: Event) => {
    if (!(event.currentTarget instanceof HTMLSlotElement)) return;

    const input = event.currentTarget
      .assignedElements()
      .find((element) => element instanceof HTMLInputElement);

    this.input = input instanceof HTMLInputElement ? input : null;
  };

  #onPointerDown = () => {
    if (!this.input || this.input.disabled) return;

    this.active = true;
    window.addEventListener("pointerup", this.#onPointerUp);
    window.addEventListener("pointercancel", this.#onPointerUp);
  };

  #onPointerUp = () => {
    this.active = false;
    window.removeEventListener("pointerup", this.#onPointerUp);
    window.removeEventListener("pointercancel", this.#onPointerUp);
  };

  #onInput = () => {
    this.requestUpdate();
  };

  #renderBubble(input: HTMLInputElement) {
    const value = input.valueAsNumber;
    const min = Number(input.min || 0);
    const max = Number(input.max || 100);
    const fraction = max > min ? (value - min) / (max - min) : 0;

    const text =
      this.unit === "%"
        ? formatPercent(value)
        : this.unit === ""
          ? String(value)
          : `${value} ${this.unit}`;

    // Follows the thumb's centre, which travels a thumb's width less than the track.
    const left = `calc(${fraction * 100}% + (0.5 - ${fraction}) * var(--sb-range-thumb))`;

    return html`<span
      class="bubble"
      style=${styleMap({ left })}
      aria-hidden="true"
      >${text}</span
    >`;
  }

  override render() {
    return html`
      <slot @slotchange=${this.#onSlotChange}></slot>
      ${this.active && this.input ? this.#renderBubble(this.input) : nothing}
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "sb-range": SbRange;
  }
}
