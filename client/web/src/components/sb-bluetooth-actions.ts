import {
  mdiDeleteOutline,
  mdiDotsHorizontal,
  mdiLinkVariant,
  mdiLinkVariantOff,
} from "@mdi/js";
import type { BluetoothDevice } from "@timmo001/effect-system-bridge";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, query } from "lit/decorators.js";

import "./sb-menu-button";
import type { MenuItem } from "./sb-menu-button";
import { shared } from "./shared-styles";
import { AtomController } from "~/controllers/atom-controller";
import {
  actionResult,
  type BluetoothAction,
  bluetoothAction,
  registry,
} from "~/lib/atoms";

/**
 * A menu of a paired device's actions: connect, disconnect or forget it.
 * Forgetting asks first, in a popover, as the device has to be paired again.
 */
@customElement("sb-bluetooth-actions")
export class SbBluetoothActions extends LitElement {
  static override styles = [
    shared,
    css`
      :host {
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        gap: var(--sb-space-1);
      }

      [popover] {
        position: fixed;
        inset: unset;
        margin: 0;
        padding: var(--sb-space-3);
        width: 18rem;
        max-width: calc(100vw - 1rem);
        color: var(--sb-color-text);
        background: var(--sb-color-raised);
        border: 1px solid var(--sb-color-border);
        border-radius: var(--sb-radius-l);
        box-shadow: var(--sb-shadow-l);
      }

      [popover] p {
        margin: 0 0 var(--sb-space-3);
        font-size: var(--sb-font-size-s);
      }

      .buttons {
        display: flex;
        justify-content: flex-end;
        gap: var(--sb-space-1);
      }
    `,
  ];

  @property({ attribute: false }) device: BluetoothDevice | null = null;

  /** Whether the adapter is on, so the device can connect. */
  @property({ type: Boolean }) powered = true;

  @query("sb-menu-button") private menuButton?: HTMLElement;

  @query("[popover]") private confirm?: HTMLElement;

  @query(".cancel") private cancel?: HTMLButtonElement;

  readonly #action = new AtomController(this, () =>
    bluetoothAction(this.device?.address ?? ""),
  );

  readonly #id = `sb-bluetooth-${Math.random().toString(36).slice(2)}`;

  #run(action: BluetoothAction) {
    if (this.device) registry.set(bluetoothAction(this.device.address), action);
  }

  /** Under the menu button, lined up with its right edge. */
  #position = () => {
    const anchor = this.menuButton;
    const confirm = this.confirm;

    if (!anchor || !confirm) return;

    const rect = anchor.getBoundingClientRect();
    const width = confirm.offsetWidth;
    const height = confirm.offsetHeight;
    const gap = 6;
    const below = window.innerHeight - rect.bottom - gap;

    const top =
      below >= height || below >= rect.top
        ? rect.bottom + gap
        : Math.max(gap, rect.top - gap - height);

    const left = Math.min(
      Math.max(gap, rect.right - width),
      window.innerWidth - width - gap,
    );

    confirm.style.top = `${top}px`;
    confirm.style.left = `${left}px`;
  };

  #onToggle = (event: ToggleEvent) => {
    if (event.newState === "open") {
      this.#position();
      window.addEventListener("resize", this.#position);
      window.addEventListener("scroll", this.#position, true);
      this.cancel?.focus();
    } else {
      window.removeEventListener("resize", this.#position);
      window.removeEventListener("scroll", this.#position, true);
    }
  };

  override disconnectedCallback(): void {
    window.removeEventListener("resize", this.#position);
    window.removeEventListener("scroll", this.#position, true);
    super.disconnectedCallback();
  }

  #onSelect = (event: CustomEvent<{ readonly value: string }>) => {
    switch (event.detail.value) {
      case "connect":
        this.#run("connect");
        break;
      case "disconnect":
        this.#run("disconnect");
        break;
      case "forget":
        this.confirm?.showPopover();
        break;
    }
  };

  #onCancelForget = () => {
    this.confirm?.hidePopover();
  };

  #onForget = () => {
    this.confirm?.hidePopover();
    this.#run("forget");
  };

  #items(device: BluetoothDevice): MenuItem[] {
    return [
      device.connected
        ? { value: "disconnect", label: "Disconnect", icon: mdiLinkVariantOff }
        : {
            value: "connect",
            label: "Connect",
            icon: mdiLinkVariant,
            disabled: !this.powered,
          },
      {
        value: "forget",
        label: "Forget",
        description: "Unpair the device",
        icon: mdiDeleteOutline,
      },
    ];
  }

  override render() {
    const device = this.device;

    if (!device) return nothing;

    const value = this.#action.value;

    const result = actionResult(value, "");

    return html`
      <sb-menu-button
        icon-only
        label="Actions for ${device.name}"
        .icon=${mdiDotsHorizontal}
        .busy=${value.waiting}
        .items=${this.#items(device)}
        @menu-select=${this.#onSelect}
      ></sb-menu-button>
      ${
        result?.success === false
          ? html`<span class="error-text" role="alert">${result.message}</span>`
          : nothing
      }
      <div
        id="${this.#id}-confirm"
        popover
        role="alertdialog"
        aria-labelledby="${this.#id}-question"
        @toggle=${this.#onToggle}
      >
        <p id="${this.#id}-question">
          Forget ${device.name}? It has to be paired again before it can
          connect.
        </p>
        <div class="buttons">
          <button
            class="button plain small cancel"
            type="button"
            @click=${this.#onCancelForget}
          >
            Cancel
          </button>
          <button
            class="button danger small"
            type="button"
            @click=${this.#onForget}
          >
            Forget
          </button>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "sb-bluetooth-actions": SbBluetoothActions;
  }
}
