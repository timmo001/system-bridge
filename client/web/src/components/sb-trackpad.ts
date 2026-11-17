import type { MouseButtonName } from "@timmo001/effect-system-bridge";
import { css, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators.js";

import { shared } from "./shared-styles";
import { sendInput } from "~/lib/atoms";

/** A press shorter than this, that barely moved, is a tap. */
const TAP_MS = 250;

/** How far, in pixels, a tap can wander and still be a tap. */
const TAP_SLOP = 8;

/** A press this soon after a tap, held and moved, drags. */
const DRAG_AFTER_TAP_MS = 300;

/** Two fingers moving this far, in pixels, scroll one notch. */
const SCROLL_NOTCH_PX = 24;

/** A wheel's pixels per notch, as Chrome reports them. */
const WHEEL_NOTCH_PX = 100;

/** Input waiting to be sent, in order. Moves and scrolls run together. */
type Op =
  | { kind: "move"; x: number; y: number }
  | { kind: "scroll"; x: number; y: number }
  | { kind: "click"; button: MouseButtonName }
  | { kind: "button"; button: MouseButtonName; action: "down" | "up" };

interface Touch {
  x: number;
  y: number;
  time: number;
}

/**
 * A trackpad for the computer's pointer. One finger moves it, a tap clicks,
 * a two-finger tap right-clicks, two fingers scroll, and a tap then hold and
 * move drags. With a mouse, drag inside it to move. Input goes one message at
 * a time, with moves gathered while one is on its way, so it keeps up on a
 * slow network without piling up. Fires `failed` with why when input fails.
 */
@customElement("sb-trackpad")
export class SbTrackpad extends LitElement {
  static override styles = [
    shared,
    css`
      :host {
        display: flex;
        flex-direction: column;
        gap: var(--gw-space-2);
      }

      .pad {
        display: grid;
        place-items: center;
        min-height: 16rem;
        aspect-ratio: 4 / 3;
        padding: var(--gw-space-4);
        color: var(--gw-color-text-secondary);
        text-align: center;
        cursor: crosshair;
        user-select: none;
        touch-action: none;
        background: var(--gw-color-surface-lower);
        border: 1px solid var(--gw-color-border-normal);
        border-radius: var(--gw-radius-l);
      }

      :host([data-active]) .pad {
        border-color: var(--gw-color-accent);
      }

      :host([disabled]) .pad {
        pointer-events: none;
        opacity: 0.5;
      }

      .buttons {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: var(--gw-space-2);
      }

      .buttons button {
        min-height: 3rem;
        font: inherit;
        color: var(--gw-color-text-primary);
        touch-action: none;
        user-select: none;
        background: var(--gw-color-surface-raised);
        border: 1px solid var(--gw-color-border-normal);
        border-radius: var(--gw-radius-m);
      }

      .buttons button:active {
        background: var(--gw-color-surface-lower);
      }
    `,
  ];

  @property({ type: Boolean, reflect: true }) disabled = false;

  /** How far the pointer moves for each pixel a finger moves. */
  @property({ type: Number }) speed = 1.5;

  readonly #touches = new Map<number, Touch>();

  readonly #ops: Op[] = [];

  #sending = false;

  /** The fraction of a pixel or notch not sent yet. */
  #moveRest = { x: 0, y: 0 };

  #scrollRest = { x: 0, y: 0 };

  /** The gesture so far, from the first finger down to the last up. */
  #gesture = {
    start: 0,
    fingers: 0,
    travel: 0,
    button: 0,
    dragArmed: false,
  };

  #dragging = false;

  #lastTapEnd = 0;

  /** The buttons held through the buttons under the pad. */
  readonly #held = new Set<MouseButtonName>();

  override connectedCallback(): void {
    super.connectedCallback();
    document.addEventListener("visibilitychange", this.#onVisibilityChange);
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    document.removeEventListener("visibilitychange", this.#onVisibilityChange);
    this.#releaseAll();
  }

  #onVisibilityChange = () => {
    if (document.hidden) this.#releaseAll();
  };

  /** Lets go of anything held, so a button never stays down. */
  #releaseAll() {
    this.#touches.clear();
    this.#endDrag();

    for (const button of this.#held) {
      this.#push({ kind: "button", button, action: "up" });
    }

    this.#held.clear();
  }

  /** Ends a gesture on the pad, letting go of a drag. */
  #endDrag() {
    this.removeAttribute("data-active");

    if (!this.#dragging) return;

    this.#dragging = false;
    this.#push({ kind: "button", button: "left", action: "up" });
  }

  #push(op: Op) {
    const last = this.#ops.at(-1);

    if (
      (op.kind === "move" || op.kind === "scroll") &&
      last !== undefined &&
      last.kind === op.kind
    ) {
      last.x += op.x;
      last.y += op.y;
    } else {
      this.#ops.push(op);
    }

    void this.#drain();
  }

  async #drain() {
    if (this.#sending) return;

    this.#sending = true;

    try {
      for (let op = this.#ops.shift(); op; op = this.#ops.shift()) {
        const next = op;

        try {
          await sendInput((bridge) => {
            switch (next.kind) {
              case "move":
                return bridge.mouseMove({ x: next.x, y: next.y });
              case "scroll":
                return bridge.mouseScroll({ x: next.x, y: next.y });
              case "click":
                return bridge.mouseClick({ button: next.button });
              case "button":
                return bridge.mouseButton({
                  button: next.button,
                  action: next.action,
                });
            }
          });
        } catch (error) {
          // The rest would fail the same way
          this.#ops.length = 0;
          this.dispatchEvent(
            new CustomEvent("failed", {
              detail: {
                message:
                  error instanceof Error ? error.message : "Input failed",
              },
            }),
          );
        }
      }
    } finally {
      this.#sending = false;
    }
  }

  #move(dx: number, dy: number, dt: number) {
    // Gentle acceleration: faster flicks go further
    const velocity = Math.hypot(dx, dy) / Math.max(dt, 1);

    const gain =
      this.speed * (1 + Math.min(Math.max((velocity - 0.3) * 1.5, 0), 2.5));

    const x = this.#moveRest.x + dx * gain;
    const y = this.#moveRest.y + dy * gain;
    const sendX = Math.trunc(x);
    const sendY = Math.trunc(y);

    this.#moveRest = { x: x - sendX, y: y - sendY };

    if (sendX !== 0 || sendY !== 0) {
      this.#push({ kind: "move", x: sendX, y: sendY });
    }
  }

  /** Scrolls by notches, from pixels, keeping the rest for later. */
  #scroll(x: number, y: number, notch: number) {
    const totalX = this.#scrollRest.x + x / notch;
    const totalY = this.#scrollRest.y + y / notch;
    const sendX = Math.trunc(totalX);
    const sendY = Math.trunc(totalY);

    this.#scrollRest = { x: totalX - sendX, y: totalY - sendY };

    if (sendX !== 0 || sendY !== 0) {
      this.#push({ kind: "scroll", x: sendX, y: sendY });
    }
  }

  #onPointerDown = (event: PointerEvent) => {
    if (!(event.currentTarget instanceof HTMLElement)) return;

    event.currentTarget.setPointerCapture(event.pointerId);
    event.preventDefault();

    const now = event.timeStamp;

    if (this.#touches.size === 0) {
      this.#gesture = {
        start: now,
        fingers: 0,
        travel: 0,
        button: event.button,
        dragArmed:
          event.pointerType !== "mouse" &&
          now - this.#lastTapEnd < DRAG_AFTER_TAP_MS,
      };
      this.#moveRest = { x: 0, y: 0 };
      this.#scrollRest = { x: 0, y: 0 };
      this.setAttribute("data-active", "");
    }

    this.#touches.set(event.pointerId, {
      x: event.clientX,
      y: event.clientY,
      time: now,
    });
    this.#gesture.fingers = Math.max(this.#gesture.fingers, this.#touches.size);
  };

  #onPointerMove = (event: PointerEvent) => {
    const touch = this.#touches.get(event.pointerId);

    if (touch === undefined) return;

    const dx = event.clientX - touch.x;
    const dy = event.clientY - touch.y;
    const dt = event.timeStamp - touch.time;

    touch.x = event.clientX;
    touch.y = event.clientY;
    touch.time = event.timeStamp;
    this.#gesture.travel += Math.hypot(dx, dy);

    if (this.#touches.size >= 2) {
      // Each finger moves the page by half, so two together move it once.
      // Natural scrolling: fingers up shows what's below.
      this.#scroll(-dx / 2, dy / 2, SCROLL_NOTCH_PX);

      return;
    }

    if (
      this.#gesture.dragArmed &&
      !this.#dragging &&
      this.#gesture.travel > TAP_SLOP
    ) {
      this.#dragging = true;
      this.#push({ kind: "button", button: "left", action: "down" });
    }

    this.#move(dx, dy, dt);
  };

  #onPointerUp = (event: PointerEvent) => {
    if (!this.#touches.delete(event.pointerId)) return;

    if (this.#touches.size > 0) return;

    if (this.#dragging) {
      this.#endDrag();

      return;
    }

    this.removeAttribute("data-active");

    const { start, fingers, travel, button } = this.#gesture;

    const tapped =
      event.timeStamp - start < TAP_MS && travel <= TAP_SLOP * fingers;

    const clicked = event.pointerType === "mouse" && travel <= TAP_SLOP;

    if (!tapped && !clicked) return;

    const right =
      fingers >= 2 || (event.pointerType === "mouse" && button === 2);

    this.#push({ kind: "click", button: right ? "right" : "left" });
    this.#lastTapEnd = right ? 0 : event.timeStamp;
  };

  /** A finger lost, such as to the browser: end the gesture without a click. */
  #onPointerCancel = (event: PointerEvent) => {
    if (!this.#touches.delete(event.pointerId)) return;

    if (this.#touches.size === 0) this.#endDrag();
  };

  #onWheel = (event: WheelEvent) => {
    event.preventDefault();

    const scale =
      event.deltaMode === WheelEvent.DOM_DELTA_LINE
        ? WHEEL_NOTCH_PX / 3
        : event.deltaMode === WheelEvent.DOM_DELTA_PAGE
          ? WHEEL_NOTCH_PX * 8
          : 1;

    // A wheel scrolls down for a positive delta, and the API down is negative
    this.#scroll(event.deltaX * scale, -event.deltaY * scale, WHEEL_NOTCH_PX);
  };

  #onContextMenu = (event: Event) => {
    event.preventDefault();
  };

  #buttonName(event: Event): MouseButtonName | undefined {
    const button =
      event.currentTarget instanceof HTMLElement
        ? event.currentTarget.dataset.button
        : undefined;

    return button === "left" || button === "right" ? button : undefined;
  }

  /** The buttons under the pad press and hold like a mouse's own. */
  #onButtonDown = (event: PointerEvent) => {
    const button = this.#buttonName(event);

    if (button === undefined || !(event.currentTarget instanceof HTMLElement)) {
      return;
    }

    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    this.#held.add(button);
    this.#push({ kind: "button", button, action: "down" });
  };

  #onButtonUp = (event: PointerEvent) => {
    const button = this.#buttonName(event);

    if (button === undefined || !this.#held.delete(button)) return;

    this.#push({ kind: "button", button, action: "up" });
  };

  /** From the keyboard, Enter or Space on a button clicks it. */
  #onButtonKey = (event: KeyboardEvent) => {
    const button = this.#buttonName(event);

    if (button === undefined || (event.key !== "Enter" && event.key !== " ")) {
      return;
    }

    event.preventDefault();
    this.#push({ kind: "click", button });
  };

  override render() {
    return html`
      <div
        class="pad"
        role="application"
        aria-label="Trackpad"
        @pointerdown=${this.#onPointerDown}
        @pointermove=${this.#onPointerMove}
        @pointerup=${this.#onPointerUp}
        @pointercancel=${this.#onPointerCancel}
        @lostpointercapture=${this.#onPointerCancel}
        @wheel=${this.#onWheel}
        @contextmenu=${this.#onContextMenu}
      >
        <p class="small">
          Drag to move · Tap to click · Two fingers to scroll · Tap with two
          fingers to right-click · Tap then hold and move to drag
        </p>
      </div>
      <div class="buttons">
        <button
          type="button"
          data-button="left"
          ?disabled=${this.disabled}
          @pointerdown=${this.#onButtonDown}
          @pointerup=${this.#onButtonUp}
          @pointercancel=${this.#onButtonUp}
          @keydown=${this.#onButtonKey}
          @contextmenu=${this.#onContextMenu}
        >
          Left
        </button>
        <button
          type="button"
          data-button="right"
          ?disabled=${this.disabled}
          @pointerdown=${this.#onButtonDown}
          @pointerup=${this.#onButtonUp}
          @pointercancel=${this.#onButtonUp}
          @keydown=${this.#onButtonKey}
          @contextmenu=${this.#onContextMenu}
        >
          Right
        </button>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "sb-trackpad": SbTrackpad;
  }
}
