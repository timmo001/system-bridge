import { mdiLoading } from "@mdi/js";
import { css, html, svg } from "lit";

/** A Material Design icon, from one of `@mdi/js`'s paths. */
export const icon = (path: string, label?: string) =>
  html`<svg
    class="icon"
    viewBox="0 0 24 24"
    role=${label === undefined ? "presentation" : "img"}
    aria-hidden=${label === undefined ? "true" : "false"}
    aria-label=${label ?? ""}
  >
    ${svg`<path d=${path}></path>`}
  </svg>`;

/** A spinning icon, for a button while its action runs. */
export const spinner = () =>
  html`<span class="row spin" aria-hidden="true">${icon(mdiLoading)}</span>`;

/**
 * Styles every component shares: type, icons, buttons, fields, cards, chips,
 * alerts and skeletons. Buttons and fields are native elements with classes,
 * so forms, focus and keyboard behaviour work as the browser intends.
 */
export const shared = css`
  :host {
    font-family: var(--sb-font-body);
    color: var(--sb-color-text);
  }

  *,
  *::before,
  *::after {
    box-sizing: border-box;
  }

  [hidden] {
    display: none !important;
  }

  h1,
  h2,
  h3,
  h4,
  p {
    margin: 0;
  }

  h1 {
    font-size: var(--sb-font-size-2xl);
    font-weight: var(--sb-font-weight-semibold);
    line-height: var(--sb-line-height-condensed);
  }

  h2 {
    font-size: var(--sb-font-size-l);
    font-weight: var(--sb-font-weight-semibold);
    line-height: var(--sb-line-height-condensed);
  }

  h3 {
    font-size: var(--sb-font-size-m);
    font-weight: var(--sb-font-weight-semibold);
  }

  a {
    color: var(--sb-color-accent);
  }

  code,
  kbd,
  pre {
    font-family: var(--sb-font-code);
  }

  kbd {
    display: inline-flex;
    align-items: center;
    padding: var(--sb-space-0-5) var(--sb-space-1-5);
    font-size: var(--sb-font-size-2xs);
    line-height: 1;
    color: var(--sb-color-muted);
    background: var(--sb-color-surface);
    border: 1px solid var(--sb-color-border);
    border-bottom-width: 2px;
    border-radius: var(--sb-radius-s);
  }

  .muted {
    color: var(--sb-color-muted);
  }

  .small {
    font-size: var(--sb-font-size-s);
  }

  .xsmall {
    font-size: var(--sb-font-size-xs);
  }

  .mono {
    font-family: var(--sb-font-code);
  }

  .tabular {
    font-variant-numeric: tabular-nums;
  }

  .truncate {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .break {
    overflow-wrap: anywhere;
  }

  .stack {
    display: flex;
    flex-direction: column;
    gap: var(--sb-stack-gap, var(--sb-space-4));
  }

  .row {
    display: flex;
    align-items: center;
    gap: var(--sb-row-gap, var(--sb-space-2));
  }

  .wrap {
    flex-wrap: wrap;
  }

  .spacer {
    flex: 1;
  }

  .grid {
    display: grid;
    gap: var(--sb-space-4);
    grid-template-columns: repeat(
      auto-fill,
      minmax(min(100%, var(--sb-grid-min, 18rem)), 1fr)
    );
  }

  .icon {
    flex: none;
    width: var(--sb-icon-size, 1.25rem);
    height: var(--sb-icon-size, 1.25rem);
    fill: currentColor;
  }

  :focus-visible {
    outline: 2px solid var(--sb-color-focus);
    outline-offset: 2px;
  }

  /* Buttons, on <button> or <a> */
  .button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: var(--sb-space-2);
    min-height: 2.25rem;
    padding: 0 var(--sb-space-4);
    font: inherit;
    font-size: var(--sb-font-size-s);
    font-weight: var(--sb-font-weight-medium);
    line-height: 1;
    color: var(--sb-color-text);
    text-decoration: none;
    white-space: nowrap;
    cursor: pointer;
    background: var(--sb-color-raised);
    border: 1px solid var(--sb-color-border);
    border-radius: var(--sb-radius-m);
    transition:
      background var(--sb-duration-fast) var(--sb-easing),
      border-color var(--sb-duration-fast) var(--sb-easing),
      color var(--sb-duration-fast) var(--sb-easing);
    --sb-icon-size: 1.125rem;
  }

  .button:hover {
    background: color-mix(
      in oklab,
      var(--sb-color-raised),
      var(--sb-color-text) 6%
    );
  }

  .button:active {
    background: color-mix(
      in oklab,
      var(--sb-color-raised),
      var(--sb-color-text) 10%
    );
  }

  .button.filled {
    color: var(--sb-color-on-accent);
    background: var(--sb-color-accent);
    border-color: transparent;
  }

  .button.filled:hover {
    background: color-mix(
      in oklab,
      var(--sb-color-accent),
      var(--sb-color-text) 12%
    );
  }

  .button.tonal {
    color: var(--sb-color-accent);
    background: var(--sb-color-accent-soft);
    border-color: transparent;
  }

  .button.tonal:hover {
    background: color-mix(in oklab, var(--sb-color-accent) 24%, transparent);
  }

  .button.plain {
    background: transparent;
    border-color: transparent;
  }

  .button.plain:hover {
    background: var(--sb-color-hover);
  }

  .button.danger {
    color: var(--sb-color-danger);
    background: var(--sb-color-danger-soft);
    border-color: transparent;
  }

  .button.danger:hover {
    background: color-mix(in oklab, var(--sb-color-danger) 26%, transparent);
  }

  .button.small {
    min-height: 1.875rem;
    padding: 0 var(--sb-space-3);
    font-size: var(--sb-font-size-xs);
    --sb-icon-size: 1rem;
  }

  .button.large {
    min-height: 3rem;
    padding: 0 var(--sb-space-6);
    font-size: var(--sb-font-size-m);
    --sb-icon-size: 1.5rem;
  }

  /* Always square, so a round one is a circle */
  .button.icon-only {
    width: 2.25rem;
    min-height: 0;
    aspect-ratio: 1;
    padding: 0;
  }

  .button.icon-only.small {
    width: 1.875rem;
  }

  .button.icon-only.large {
    width: 3rem;
  }

  .button.round {
    border-radius: var(--sb-radius-pill);
  }

  .button:disabled,
  .button[aria-disabled="true"] {
    opacity: 0.5;
    cursor: not-allowed;
    pointer-events: none;
  }

  .button.plain:disabled,
  .button.plain[aria-disabled="true"] {
    color: var(--sb-color-muted);
  }

  .spin {
    animation: spin 0.9s linear infinite;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  /* Fields */
  .field {
    display: flex;
    flex-direction: column;
    gap: var(--sb-space-1-5);
  }

  .field > label,
  .label {
    font-size: var(--sb-font-size-s);
    font-weight: var(--sb-font-weight-medium);
  }

  .hint {
    font-size: var(--sb-font-size-xs);
    color: var(--sb-color-muted);
  }

  .error-text {
    font-size: var(--sb-font-size-xs);
    color: var(--sb-color-danger);
  }

  .input {
    width: 100%;
    min-height: 2.5rem;
    padding: 0 var(--sb-space-3);
    font: inherit;
    font-size: var(--sb-font-size-s);
    color: var(--sb-color-text);
    background: var(--sb-color-sunken);
    border: 1px solid var(--sb-color-border);
    border-radius: var(--sb-radius-m);
    transition: border-color var(--sb-duration-fast) var(--sb-easing);
  }

  .input::placeholder {
    color: color-mix(in oklab, var(--sb-color-muted) 80%, transparent);
  }

  .input:hover {
    border-color: color-mix(
      in oklab,
      var(--sb-color-border),
      var(--sb-color-text) 20%
    );
  }

  .input:focus-visible {
    outline: none;
    border-color: var(--sb-color-accent);
    box-shadow: 0 0 0 3px var(--sb-color-accent-soft);
  }

  .input[aria-invalid="true"] {
    border-color: var(--sb-color-danger);
  }

  .input:disabled {
    opacity: 0.6;
  }

  /* A checkbox drawn as a switch */
  .switch {
    appearance: none;
    position: relative;
    flex: none;
    width: 2.5rem;
    height: 1.5rem;
    margin: 0;
    cursor: pointer;
    background: var(--sb-color-sunken);
    border: 1px solid var(--sb-color-border);
    border-radius: var(--sb-radius-pill);
    transition: background var(--sb-duration-fast) var(--sb-easing);
  }

  .switch::after {
    content: "";
    position: absolute;
    top: 0.1875rem;
    left: 0.1875rem;
    width: 1rem;
    height: 1rem;
    background: var(--sb-color-muted);
    border-radius: 50%;
    transition:
      translate var(--sb-duration-fast) var(--sb-easing),
      background var(--sb-duration-fast) var(--sb-easing);
  }

  .switch:checked {
    background: var(--sb-color-accent);
    border-color: transparent;
  }

  .switch:checked::after {
    translate: 1rem 0;
    background: var(--sb-color-on-accent);
  }

  .switch:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .checkbox {
    width: 1.125rem;
    height: 1.125rem;
    margin: 0;
    accent-color: var(--sb-color-accent);
  }

  /* A row with a label on one side and a control on the other. A wide
     control drops under its label when there isn't room for both */
  .setting {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: var(--sb-space-2) var(--sb-space-4);
    padding: var(--sb-space-3) 0;
  }

  .setting > :first-child {
    flex: 1 1 12rem;
    min-width: 0;
  }

  .setting > :last-child:not(:first-child) {
    max-width: 100%;
  }

  .setting + .setting {
    border-top: 1px solid var(--sb-color-border);
  }

  /* Cards */
  .card {
    display: flex;
    flex-direction: column;
    gap: var(--sb-space-4);
    padding: var(--sb-space-5);
    background: var(--sb-color-surface);
    border: 1px solid var(--sb-color-border);
    border-radius: var(--sb-radius-l);
  }

  .card.flush {
    padding: 0;
    overflow: hidden;
  }

  a.card {
    color: inherit;
    text-decoration: none;
    transition: border-color var(--sb-duration-fast) var(--sb-easing);
  }

  a.card:hover {
    border-color: color-mix(
      in oklab,
      var(--sb-color-accent) 50%,
      var(--sb-color-border)
    );
  }

  /* Chips and badges */
  .chip {
    display: inline-flex;
    align-items: center;
    gap: var(--sb-space-1-5);
    min-height: 1.75rem;
    padding: 0 var(--sb-space-3);
    font-size: var(--sb-font-size-xs);
    font-weight: var(--sb-font-weight-medium);
    color: var(--sb-chip-color, var(--sb-color-text));
    background: color-mix(
      in oklab,
      var(--sb-chip-color, var(--sb-color-muted)) 14%,
      transparent
    );
    border-radius: var(--sb-radius-pill);
    --sb-icon-size: 1rem;
  }

  .chip.success {
    --sb-chip-color: var(--sb-color-success);
  }

  .chip.warning {
    --sb-chip-color: var(--sb-color-warning);
  }

  .chip.danger {
    --sb-chip-color: var(--sb-color-danger);
  }

  .chip.info {
    --sb-chip-color: var(--sb-color-info);
  }

  .chip.accent {
    --sb-chip-color: var(--sb-color-accent);
  }

  .dot {
    width: 0.5rem;
    height: 0.5rem;
    background: currentColor;
    border-radius: 50%;
  }

  /* Placeholders while data loads, sized like what they stand in for */
  .skeleton {
    display: block;
    min-height: 1rem;
    background: linear-gradient(
      90deg,
      var(--sb-color-sunken) 25%,
      color-mix(in oklab, var(--sb-color-sunken), var(--sb-color-text) 6%) 50%,
      var(--sb-color-sunken) 75%
    );
    background-size: 200% 100%;
    border-radius: var(--sb-radius-m);
    animation: shimmer 1.4s ease-in-out infinite;
  }

  @keyframes shimmer {
    from {
      background-position: 100% 0;
    }

    to {
      background-position: -100% 0;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .skeleton,
    .spin {
      animation: none;
    }
  }

  .empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: var(--sb-space-2);
    padding: var(--sb-space-8) var(--sb-space-4);
    color: var(--sb-color-muted);
    text-align: center;
    --sb-icon-size: 2.5rem;
  }

  /* Label and value pairs */
  dl.facts {
    display: grid;
    grid-template-columns: minmax(7rem, max-content) 1fr;
    gap: var(--sb-space-2) var(--sb-space-4);
    margin: 0;
    font-size: var(--sb-font-size-s);
  }

  dl.facts dt {
    color: var(--sb-color-muted);
  }

  dl.facts dd {
    margin: 0;
    min-width: 0;
    overflow-wrap: anywhere;
  }
`;

/** The layout every page shares: a header, then its content. */
export const pageStyles = css`
  :host {
    display: block;
  }

  .page {
    display: flex;
    flex-direction: column;
    gap: var(--sb-space-6);
    width: 100%;
    max-width: var(--sb-page-width, var(--sb-content-width));
    margin: 0 auto;
  }

  .page.narrow {
    --sb-page-width: 56rem;
  }

  /* A section of another page takes the room that page gives it, under a
     smaller heading */
  :host([embedded]) .page {
    gap: var(--sb-space-4);
    max-width: none;
    margin: 0;
  }

  :host([embedded]) .page-header .tile {
    width: 2.5rem;
    height: 2.5rem;
    border-radius: var(--sb-radius-m);
    --sb-icon-size: 1.375rem;
  }

  :host([embedded]) .page-header h2 {
    font-size: var(--sb-font-size-l);
  }

  .page-header {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--sb-space-4);
  }

  .page-header .tile {
    display: grid;
    place-items: center;
    width: 3rem;
    height: 3rem;
    color: var(--sb-color-accent);
    background: var(--sb-color-accent-soft);
    border-radius: var(--sb-radius-l);
    --sb-icon-size: 1.625rem;
  }

  .page-header .titles {
    display: flex;
    flex: 1;
    flex-direction: column;
    gap: var(--sb-space-1);
    min-width: min(100%, 14rem);
  }

  .page-header .description {
    font-size: var(--sb-font-size-s);
    color: var(--sb-color-muted);
  }

  /* Controls sit at the top right, beside the title, at every width */
  .page-header:has(.actions) {
    flex-wrap: nowrap;
    align-items: flex-start;
  }

  .page-header .actions {
    display: flex;
    flex: none;
    align-items: center;
    justify-content: flex-end;
    gap: var(--sb-space-2);
    margin-inline-start: auto;
  }

  .page-header:has(.actions) .titles {
    min-width: 0;
  }

  .page-header:has(.actions) h1 {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .section-title {
    font-size: var(--sb-font-size-xs);
    font-weight: var(--sb-font-weight-semibold);
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: var(--sb-color-muted);
  }

  .connection-required {
    align-items: center;
    padding: var(--sb-space-10) var(--sb-space-6);
    text-align: center;
  }

  .connection-required .tile {
    display: grid;
    place-items: center;
    width: 3.5rem;
    height: 3.5rem;
    color: var(--sb-color-danger);
    background: var(--sb-color-danger-soft);
    border-radius: 50%;
    --sb-icon-size: 1.75rem;
  }

  .connection-required p {
    max-width: 32rem;
  }
`;
