import { mdiCheck, mdiChevronDown, mdiMagnify } from "@mdi/js";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, query, state } from "lit/decorators.js";
import { repeat } from "lit/directives/repeat.js";

import { icon, shared } from "./shared-styles";

export interface SelectOption {
  readonly value: string;
  readonly label: string;
  readonly description?: string;
  /** An `@mdi/js` path shown before the label. */
  readonly icon?: string;
  /** Options with the same group are listed together under its name. */
  readonly group?: string;
  /** Colours shown as small swatches, such as a theme's palette. */
  readonly swatches?: readonly string[];
  /** Words that also match a search, but aren't shown. */
  readonly keywords?: readonly string[];
}

const matches = (option: SelectOption, query: string) =>
  [
    option.label,
    option.description,
    option.group,
    option.value,
    ...(option.keywords ?? []),
  ].some((text) => text?.toLowerCase().includes(query));

/**
 * A select whose options can be searched, after Home Assistant's pickers. The
 * list opens in a popover under the trigger; type to filter it, move with the
 * arrow keys and choose with Enter.
 *
 * @fires value-changed - With the chosen option's value.
 */
@customElement("sb-select")
export class SbSelect extends LitElement {
  static override styles = [
    shared,
    css`
      :host {
        display: inline-block;
        min-width: 0;
      }

      .trigger {
        width: 100%;
        justify-content: flex-start;
        background: var(--sb-color-sunken);
      }

      .trigger .value {
        flex: 1;
        min-width: 0;
        text-align: start;
      }

      .trigger .chevron {
        color: var(--sb-color-muted);
        transition: rotate var(--sb-duration-fast) var(--sb-easing);
      }

      :host([open]) .trigger .chevron {
        rotate: 180deg;
      }

      /* Phones rarely have a keyboard, and the value needs the room */
      @media (width < 40rem) {
        .trigger kbd {
          display: none;
        }
      }

      [popover] {
        position: fixed;
        inset: unset;
        margin: 0;
        padding: 0;
        width: var(--sb-select-width, 20rem);
        max-width: calc(100vw - 1rem);
        color: var(--sb-color-text);
        background: var(--sb-color-raised);
        border: 1px solid var(--sb-color-border);
        border-radius: var(--sb-radius-l);
        box-shadow: var(--sb-shadow-l);
        overflow: hidden;
      }

      .search {
        display: flex;
        align-items: center;
        gap: var(--sb-space-2);
        padding: var(--sb-space-2) var(--sb-space-3);
        border-bottom: 1px solid var(--sb-color-border);
        color: var(--sb-color-muted);
      }

      .search input {
        flex: 1;
        min-width: 0;
        height: 2rem;
        padding: 0;
        font: inherit;
        font-size: var(--sb-font-size-s);
        color: var(--sb-color-text);
        background: none;
        border: 0;
        outline: none;
      }

      [role="listbox"] {
        max-height: var(--sb-select-max-height, 22rem);
        margin: 0;
        padding: var(--sb-space-1-5);
        overflow-y: auto;
        overscroll-behavior: contain;
      }

      .group {
        padding: var(--sb-space-2) var(--sb-space-2) var(--sb-space-1);
        font-size: var(--sb-font-size-2xs);
        font-weight: var(--sb-font-weight-semibold);
        letter-spacing: 0.04em;
        text-transform: uppercase;
        color: var(--sb-color-muted);
      }

      [role="option"] {
        display: flex;
        align-items: center;
        gap: var(--sb-space-3);
        min-height: 2.5rem;
        padding: var(--sb-space-1-5) var(--sb-space-2);
        font-size: var(--sb-font-size-s);
        cursor: pointer;
        border-radius: var(--sb-radius-m);
        scroll-margin: var(--sb-space-1-5);
      }

      [role="option"][data-active] {
        background: var(--sb-color-hover);
      }

      [role="option"][aria-selected="true"] {
        color: var(--sb-color-accent);
      }

      [role="option"] > .icon:first-child {
        color: var(--sb-color-muted);
      }

      [role="option"][aria-selected="true"] > .icon {
        color: inherit;
      }

      .text {
        display: flex;
        flex: 1;
        flex-direction: column;
        min-width: 0;
      }

      .text .description {
        font-size: var(--sb-font-size-xs);
        color: var(--sb-color-muted);
      }

      .swatches {
        display: flex;
      }

      .swatches span {
        width: 0.875rem;
        height: 0.875rem;
        margin-inline-start: -0.25rem;
        border: 1px solid
          color-mix(in oklab, var(--sb-color-text) 20%, transparent);
        border-radius: 50%;
      }

      .none {
        padding: var(--sb-space-4);
        font-size: var(--sb-font-size-s);
        color: var(--sb-color-muted);
        text-align: center;
      }
    `,
  ];

  @property({ attribute: false })
  options: readonly SelectOption[] = [];

  @property() value = "";

  /** Names the select for assistive technology. */
  @property() label = "";

  @property() placeholder = "Choose";

  @property({ attribute: "search-placeholder" })
  searchPlaceholder = "Search";

  /** A keyboard shortcut to show on the trigger, such as `Ctrl K`. */
  @property() shortcut = "";

  @property({ type: Boolean, reflect: true }) open = false;

  @property({ type: Boolean }) disabled = false;

  @state() private query = "";

  @state() private active = 0;

  @query(".trigger") private trigger?: HTMLButtonElement;

  @query("[popover]") private list?: HTMLElement;

  @query(".search input") private search?: HTMLInputElement;

  @query("[role='option'][data-active]") private activeOption?: HTMLElement;

  readonly #id = `sb-select-${Math.random().toString(36).slice(2)}`;

  /** Opens the list, such as from a keyboard shortcut. */
  show(): void {
    if (this.disabled || this.open) return;

    this.list?.showPopover();
  }

  #filtered(): readonly SelectOption[] {
    const query = this.query.trim().toLowerCase();

    return query === ""
      ? this.options
      : this.options.filter((option) => matches(option, query));
  }

  #position = () => {
    const trigger = this.trigger;
    const popover = this.list;

    if (!trigger || !popover) return;

    const rect = trigger.getBoundingClientRect();
    const width = popover.offsetWidth;
    const height = popover.offsetHeight;
    const gap = 6;
    const below = window.innerHeight - rect.bottom - gap;

    const top =
      below >= height || below >= rect.top
        ? rect.bottom + gap
        : Math.max(gap, rect.top - gap - height);

    const left = Math.min(
      Math.max(gap, rect.left),
      window.innerWidth - width - gap,
    );

    popover.style.top = `${top}px`;
    popover.style.left = `${left}px`;
  };

  #onToggle = (event: ToggleEvent) => {
    this.open = event.newState === "open";

    if (this.open) {
      this.query = "";
      this.active = Math.max(
        0,
        this.options.findIndex((option) => option.value === this.value),
      );
      this.#position();
      window.addEventListener("resize", this.#position);
      window.addEventListener("scroll", this.#position, true);
      void this.updateComplete.then(() => {
        this.search?.focus();
        this.#scrollToActive();
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

  #choose(option: SelectOption | undefined) {
    if (option === undefined) return;

    this.list?.hidePopover();
    this.trigger?.focus();

    if (option.value !== this.value) {
      this.value = option.value;
      this.dispatchEvent(
        new CustomEvent("value-changed", {
          detail: { value: option.value },
          bubbles: true,
          composed: true,
        }),
      );
    }
  }

  #scrollToActive() {
    this.activeOption?.scrollIntoView({ block: "nearest" });
  }

  /** The index of the option an event happened on, if any. */
  #optionIndex(event: Event): number | undefined {
    const option = event
      .composedPath()
      .find(
        (target) =>
          target instanceof HTMLElement && target.dataset.index !== undefined,
      );

    return option instanceof HTMLElement
      ? Number(option.dataset.index)
      : undefined;
  }

  #onOptionPointerMove = (event: PointerEvent) => {
    const index = this.#optionIndex(event);

    if (index !== undefined && index !== this.active) this.active = index;
  };

  #onOptionClick = (event: MouseEvent) => {
    const index = this.#optionIndex(event);

    if (index !== undefined) this.#choose(this.#filtered()[index]);
  };

  #onInput = (event: InputEvent) => {
    if (event.target instanceof HTMLInputElement) {
      this.query = event.target.value;
      this.active = 0;
    }
  };

  #onKeyDown = (event: KeyboardEvent) => {
    const filtered = this.#filtered();
    const last = filtered.length - 1;

    switch (event.key) {
      case "ArrowDown":
        this.active = this.active >= last ? 0 : this.active + 1;
        break;
      case "ArrowUp":
        this.active = this.active <= 0 ? last : this.active - 1;
        break;
      case "Home":
        this.active = 0;
        break;
      case "End":
        this.active = last;
        break;
      case "Enter":
        this.#choose(filtered[this.active]);
        break;
      case "Tab":
        this.list?.hidePopover();

        return;
      default:
        return;
    }

    event.preventDefault();
    void this.updateComplete.then(() => this.#scrollToActive());
  };

  #onTriggerKeyDown = (event: KeyboardEvent) => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      this.show();
    }
  };

  #renderSwatches(swatches: readonly string[] | undefined) {
    if (swatches === undefined) return nothing;

    const dots = swatches.map(
      (colour) => html`<span style="background: ${colour}"></span>`,
    );

    return html`<span class="swatches" aria-hidden="true">${dots}</span>`;
  }

  #renderOptions(filtered: readonly SelectOption[]) {
    if (filtered.length === 0) {
      return html`<div class="none">No matches</div>`;
    }

    return repeat(
      filtered,
      (option) => option.value,
      (option, index) => html`
        ${
          option.group !== undefined &&
          option.group !== filtered[index - 1]?.group
            ? html`<div class="group" role="presentation">${option.group}</div>`
            : nothing
        }
        <div
          id="${this.#id}-${index}"
          role="option"
          data-index=${index}
          aria-selected=${option.value === this.value ? "true" : "false"}
          ?data-active=${index === this.active}
        >
          ${option.icon === undefined ? nothing : icon(option.icon)}
          <span class="text">
            <span class="truncate">${option.label}</span>
            ${
              option.description === undefined
                ? nothing
                : html`<span class="description truncate"
                    >${option.description}</span
                  >`
            }
          </span>
          ${this.#renderSwatches(option.swatches)}
          ${option.value === this.value ? icon(mdiCheck) : nothing}
        </div>
      `,
    );
  }

  override render() {
    const selected = this.options.find((option) => option.value === this.value);
    const filtered = this.open ? this.#filtered() : [];

    return html`
      <button
        class="button trigger"
        type="button"
        popovertarget="${this.#id}-list"
        aria-haspopup="listbox"
        aria-expanded=${this.open ? "true" : "false"}
        aria-label=${this.label || nothing}
        ?disabled=${this.disabled}
        @keydown=${this.#onTriggerKeyDown}
      >
        ${selected?.icon === undefined ? nothing : icon(selected.icon)}
        <span class="value truncate">
          ${
            selected?.label ??
            html`<span class="muted">${this.placeholder}</span>`
          }
        </span>
        ${this.#renderSwatches(selected?.swatches)}
        ${this.shortcut === "" ? nothing : html`<kbd>${this.shortcut}</kbd>`}
        <span class="chevron row">${icon(mdiChevronDown)}</span>
      </button>
      <div id="${this.#id}-list" popover @toggle=${this.#onToggle}>
        <div class="search">
          ${icon(mdiMagnify)}
          <input
            type="search"
            role="combobox"
            aria-expanded=${this.open ? "true" : "false"}
            aria-controls="${this.#id}-options"
            aria-activedescendant=${this.open ? `${this.#id}-${this.active}` : nothing}
            aria-autocomplete="list"
            aria-label=${this.label || this.searchPlaceholder}
            autocomplete="off"
            spellcheck="false"
            placeholder=${this.searchPlaceholder}
            .value=${this.query}
            @input=${this.#onInput}
            @keydown=${this.#onKeyDown}
          />
        </div>
        <div
          id="${this.#id}-options"
          role="listbox"
          aria-label=${this.label || nothing}
          @pointermove=${this.#onOptionPointerMove}
          @click=${this.#onOptionClick}
        >
          ${this.open ? this.#renderOptions(filtered) : nothing}
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "sb-select": SbSelect;
  }

  interface HTMLElementEventMap {
    "value-changed": CustomEvent<{ readonly value: string }>;
  }
}
