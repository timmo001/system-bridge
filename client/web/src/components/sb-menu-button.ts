import {
  mdiCheckboxBlankOutline,
  mdiCheckboxMarked,
  mdiChevronDown,
} from "@mdi/js";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, query, queryAll } from "lit/decorators.js";

import { icon, shared, spinner } from "./shared-styles";

export interface MenuItem {
  readonly value: string;
  readonly label: string;
  readonly description?: string;
  /** An `@mdi/js` path shown before the label. */
  readonly icon?: string;
  /** A checkbox toggles and keeps the menu open; an action closes it. */
  readonly kind?: "action" | "checkbox";
  readonly checked?: boolean;
  readonly disabled?: boolean;
  /** Items with the same group are listed together under its name. */
  readonly group?: string;
}

/**
 * A button that opens a menu in a popover under it. Move through the menu
 * with the arrow keys, and choose or toggle with Enter or Space.
 *
 * @fires menu-select - With the chosen action's value.
 * @fires menu-toggle - With a checkbox's value and whether it's now checked.
 */
@customElement("sb-menu-button")
export class SbMenuButton extends LitElement {
  static override styles = [
    shared,
    css`
      :host {
        display: inline-block;
      }

      .trigger .chevron {
        color: var(--sb-color-muted);
        transition: rotate var(--sb-duration-fast) var(--sb-easing);
      }

      :host([open]) .trigger .chevron {
        rotate: 180deg;
      }

      /* The label gives way to the icon when there's no room for it */
      @media (max-width: 40rem) {
        :host([narrow-icon]) .trigger .label {
          position: absolute;
          width: 1px;
          height: 1px;
          overflow: hidden;
          clip-path: inset(50%);
        }
      }

      [popover] {
        position: fixed;
        inset: unset;
        margin: 0;
        padding: var(--sb-space-1-5);
        min-width: 14rem;
        max-width: calc(100vw - 1rem);
        color: var(--sb-color-text);
        background: var(--sb-color-raised);
        border: 1px solid var(--sb-color-border);
        border-radius: var(--sb-radius-l);
        box-shadow: var(--sb-shadow-l);
      }

      .group {
        padding: var(--sb-space-2) var(--sb-space-2) var(--sb-space-1);
        font-size: var(--sb-font-size-2xs);
        font-weight: var(--sb-font-weight-semibold);
        letter-spacing: 0.04em;
        text-transform: uppercase;
        color: var(--sb-color-muted);
      }

      .group:not(:first-child) {
        margin-top: var(--sb-space-1-5);
        border-top: 1px solid var(--sb-color-border);
        padding-top: var(--sb-space-3);
      }

      [role="menuitem"][aria-disabled="true"] {
        cursor: default;
        opacity: 0.5;
      }

      [role="menuitemcheckbox"] .check {
        color: var(--sb-color-muted);
      }

      [role="menuitemcheckbox"][aria-checked="true"] .check {
        color: var(--sb-color-accent);
      }

      [role="menuitem"],
      [role="menuitemcheckbox"] {
        display: flex;
        align-items: center;
        gap: var(--sb-space-3);
        width: 100%;
        min-height: 2.5rem;
        padding: var(--sb-space-1-5) var(--sb-space-2);
        font: inherit;
        font-size: var(--sb-font-size-s);
        color: inherit;
        text-align: start;
        cursor: pointer;
        background: none;
        border: 0;
        border-radius: var(--sb-radius-m);
      }

      [role="menuitem"]:not([aria-disabled="true"]):hover,
      [role="menuitemcheckbox"]:hover,
      [role^="menuitem"]:focus-visible {
        background: var(--sb-color-hover);
        outline: none;
      }

      [role="menuitem"] > .icon:first-child {
        color: var(--sb-color-muted);
      }

      .text {
        display: flex;
        flex-direction: column;
        min-width: 0;
      }

      .text .description {
        font-size: var(--sb-font-size-xs);
        color: var(--sb-color-muted);
      }
    `,
  ];

  @property({ attribute: false }) items: readonly MenuItem[] = [];

  /** The trigger's text. */
  @property() label = "";

  /** An `@mdi/js` path shown before the trigger's text. */
  @property({ attribute: false }) icon: string | undefined = undefined;

  /** Names the menu for assistive technology, when the label isn't enough. */
  @property({ attribute: "menu-label" }) menuLabel = "";

  /** Shows only the icon on narrow screens, keeping the label for assistive technology. */
  @property({ type: Boolean, reflect: true, attribute: "narrow-icon" })
  narrowIcon = false;

  /** Shows a spinner and disables the trigger while an action runs. */
  @property({ type: Boolean }) busy = false;

  @property({ type: Boolean, reflect: true }) open = false;

  @query(".trigger") private trigger?: HTMLButtonElement;

  @query("[popover]") private menu?: HTMLElement;

  @queryAll("[role^='menuitem']") private menuItems?: NodeListOf<HTMLElement>;

  readonly #id = `sb-menu-${Math.random().toString(36).slice(2)}`;

  /** Where focus goes when the menu opens: the first or the last item. */
  #focusLast = false;

  #position = () => {
    const trigger = this.trigger;
    const menu = this.menu;

    if (!trigger || !menu) return;

    const rect = trigger.getBoundingClientRect();
    const width = menu.offsetWidth;
    const height = menu.offsetHeight;
    const gap = 6;
    const below = window.innerHeight - rect.bottom - gap;

    const top =
      below >= height || below >= rect.top
        ? rect.bottom + gap
        : Math.max(gap, rect.top - gap - height);

    // Lined up with the trigger's right edge, as it usually ends a header
    const left = Math.min(
      Math.max(gap, rect.right - width),
      window.innerWidth - width - gap,
    );

    menu.style.top = `${top}px`;
    menu.style.left = `${left}px`;
  };

  #onToggle = (event: ToggleEvent) => {
    this.open = event.newState === "open";

    if (this.open) {
      this.#position();
      window.addEventListener("resize", this.#position);
      window.addEventListener("scroll", this.#position, true);
      void this.updateComplete.then(() => {
        const items = [...(this.menuItems ?? [])];

        (this.#focusLast ? items.at(-1) : items[0])?.focus();
        this.#focusLast = false;
      });
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

  #onTriggerKeyDown = (event: KeyboardEvent) => {
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;

    event.preventDefault();
    this.#focusLast = event.key === "ArrowUp";
    this.menu?.showPopover();
  };

  #onMenuKeyDown = (event: KeyboardEvent) => {
    const items = [...(this.menuItems ?? [])];

    const index = items.findIndex(
      (item) => item === this.shadowRoot?.activeElement,
    );

    const last = items.length - 1;

    const next =
      event.key === "ArrowDown"
        ? index >= last
          ? 0
          : index + 1
        : event.key === "ArrowUp"
          ? index <= 0
            ? last
            : index - 1
          : event.key === "Home"
            ? 0
            : event.key === "End"
              ? last
              : undefined;

    if (event.key === "Tab") {
      this.menu?.hidePopover();

      return;
    }

    if (next === undefined) return;

    event.preventDefault();
    items[next]?.focus();
  };

  #onItemClick = (event: MouseEvent) => {
    const item = event
      .composedPath()
      .find(
        (target) =>
          target instanceof HTMLElement && target.dataset.value !== undefined,
      );

    if (!(item instanceof HTMLElement)) return;

    const chosen = this.items.find(({ value }) => value === item.dataset.value);

    if (chosen === undefined || chosen.disabled === true) return;

    // A checkbox keeps the menu open, so several can be changed in a row
    if (chosen.kind === "checkbox") {
      this.dispatchEvent(
        new CustomEvent("menu-toggle", {
          detail: { value: chosen.value, checked: !chosen.checked },
          bubbles: true,
          composed: true,
        }),
      );

      return;
    }

    this.menu?.hidePopover();
    this.trigger?.focus();
    this.dispatchEvent(
      new CustomEvent("menu-select", {
        detail: { value: chosen.value },
        bubbles: true,
        composed: true,
      }),
    );
  };

  #renderItem(item: MenuItem) {
    const checkbox = item.kind === "checkbox";

    return html`<button
      type="button"
      role=${checkbox ? "menuitemcheckbox" : "menuitem"}
      tabindex="-1"
      data-value=${item.value}
      aria-checked=${checkbox ? (item.checked ? "true" : "false") : nothing}
      aria-disabled=${item.disabled ? "true" : nothing}
    >
      ${
        checkbox
          ? html`<span class="check row"
              >${icon(
                item.checked ? mdiCheckboxMarked : mdiCheckboxBlankOutline,
              )}</span
            >`
          : nothing
      }
      ${item.icon === undefined ? nothing : icon(item.icon)}
      <span class="text">
        <span>${item.label}</span>
        ${
          item.description === undefined
            ? nothing
            : html`<span class="description">${item.description}</span>`
        }
      </span>
    </button>`;
  }

  override render() {
    // Runs of items in the same group, each labelled for assistive technology
    const runs: { group: string | undefined; items: MenuItem[] }[] = [];

    for (const item of this.items) {
      const run = runs.at(-1);

      if (run !== undefined && run.group === item.group) {
        run.items.push(item);
      } else {
        runs.push({ group: item.group, items: [item] });
      }
    }

    const items = runs.map(({ group, items: grouped }) => {
      const rendered = grouped.map((item) => this.#renderItem(item));

      return group === undefined
        ? rendered
        : html`<div class="group" aria-hidden="true">${group}</div>
            <div role="group" aria-label=${group}>${rendered}</div>`;
    });

    return html`
      <button
        class="button small trigger"
        type="button"
        popovertarget="${this.#id}-menu"
        aria-haspopup="menu"
        aria-expanded=${this.open ? "true" : "false"}
        aria-busy=${this.busy ? "true" : "false"}
        ?disabled=${this.busy}
        @keydown=${this.#onTriggerKeyDown}
      >
        ${
          this.busy
            ? spinner()
            : this.icon === undefined
              ? nothing
              : icon(this.icon)
        }
        <span class="label">${this.label}</span>
        <span class="chevron row">${icon(mdiChevronDown)}</span>
      </button>
      <div
        id="${this.#id}-menu"
        popover
        role="menu"
        aria-label=${this.menuLabel || this.label}
        @toggle=${this.#onToggle}
        @keydown=${this.#onMenuKeyDown}
        @click=${this.#onItemClick}
      >
        ${items}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "sb-menu-button": SbMenuButton;
  }

  interface HTMLElementEventMap {
    "menu-select": CustomEvent<{ readonly value: string }>;
    "menu-toggle": CustomEvent<{
      readonly value: string;
      readonly checked: boolean;
    }>;
  }
}
