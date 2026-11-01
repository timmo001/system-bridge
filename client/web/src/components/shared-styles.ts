import { css, html, svg } from "lit";

import "@timmo001/groundwork-ui/gw-chip.ts";
import "@timmo001/groundwork-ui/gw-dot.ts";
import "@timmo001/groundwork-ui/gw-spinner.ts";

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

/**
 * A spinner in place of a button's icon while its action runs. It waits
 * before fading in, so a quick action never flashes it.
 */
export const spinner = () => html`<gw-spinner label="Working"></gw-spinner>`;

/**
 * Styles every component shares: type, icons, buttons, fields, chips and
 * facts. Buttons and fields are native elements with classes,
 * so forms, focus and keyboard behaviour work as the browser intends.
 */
export const shared = css`
  :host {
    font-family: var(--gw-font-sans);
    color: var(--gw-color-text-primary);
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
    font-size: var(--gw-font-size-2xl);
    font-weight: var(--gw-font-weight-strong);
    line-height: 1.2;
  }

  h2 {
    font-size: var(--gw-font-size-l);
    font-weight: var(--gw-font-weight-strong);
    line-height: 1.2;
  }

  h3 {
    font-size: var(--gw-font-size-m);
    font-weight: var(--gw-font-weight-strong);
  }

  a {
    color: var(--gw-color-accent);
  }

  code,
  kbd,
  pre {
    font-family: var(--gw-font-mono);
  }

  kbd {
    display: inline-flex;
    align-items: center;
    padding: var(--gw-space-0-5) calc(var(--gw-space-1) * 1.5);
    font-size: var(--gw-font-size-2xs);
    line-height: 1;
    color: var(--gw-color-text-secondary);
    background: var(--gw-color-surface-raised);
    border: 1px solid var(--gw-color-border-normal);
    border-bottom-width: 2px;
    border-radius: var(--gw-radius-s);
  }

  .muted {
    color: var(--gw-color-text-secondary);
  }

  .small {
    font-size: var(--gw-font-size-s);
  }

  .xsmall {
    font-size: var(--gw-font-size-xs);
  }

  .mono {
    font-family: var(--gw-font-mono);
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
    gap: var(--sb-stack-gap, var(--gw-space-4));
  }

  .row {
    display: flex;
    align-items: center;
    gap: var(--sb-row-gap, var(--gw-space-2));
  }

  .wrap {
    flex-wrap: wrap;
  }

  .spacer {
    flex: 1;
  }

  .grid {
    display: grid;
    gap: var(--gw-space-4);
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
    outline: 2px solid var(--gw-color-focus);
    outline-offset: 2px;
  }

  /* Buttons, on <button> or <a> */
  .button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: var(--gw-space-2);
    min-height: 2.25rem;
    padding: 0 var(--gw-space-4);
    font: inherit;
    font-size: var(--gw-font-size-s);
    font-weight: var(--gw-font-weight-strong);
    line-height: 1;
    color: var(--gw-color-text-primary);
    text-decoration: none;
    white-space: nowrap;
    cursor: pointer;
    background: var(--gw-color-surface-overlay);
    border: 1px solid var(--gw-color-border-normal);
    border-radius: var(--gw-radius-m);
    transition:
      background var(--gw-motion-fast) var(--gw-motion-easing),
      border-color var(--gw-motion-fast) var(--gw-motion-easing),
      color var(--gw-motion-fast) var(--gw-motion-easing);
    --sb-icon-size: 1.125rem;
  }

  .button:hover {
    background: color-mix(
      in oklab,
      var(--gw-color-surface-overlay),
      var(--gw-color-text-primary) 6%
    );
  }

  .button:active {
    background: color-mix(
      in oklab,
      var(--gw-color-surface-overlay),
      var(--gw-color-text-primary) 10%
    );
  }

  .button.filled {
    color: var(--gw-color-on-accent);
    background: var(--gw-color-accent);
    border-color: transparent;
  }

  .button.filled:hover {
    background: color-mix(
      in oklab,
      var(--gw-color-accent),
      var(--gw-color-text-primary) 12%
    );
  }

  .button.tonal {
    color: var(--gw-color-accent);
    background: var(--gw-color-fill-accent-quiet);
    border-color: transparent;
  }

  .button.tonal:hover {
    background: color-mix(in oklab, var(--gw-color-accent) 24%, transparent);
  }

  .button.plain {
    background: transparent;
    border-color: transparent;
  }

  .button.plain:hover {
    background: var(--gw-color-fill-neutral-hovered);
  }

  .button.danger {
    color: var(--gw-color-danger);
    background: var(--gw-color-fill-danger-quiet);
    border-color: transparent;
  }

  .button.danger:hover {
    background: color-mix(in oklab, var(--gw-color-danger) 26%, transparent);
  }

  .button.small {
    min-height: 1.875rem;
    padding: 0 var(--gw-space-3);
    font-size: var(--gw-font-size-xs);
    --sb-icon-size: 1rem;
  }

  .button.large {
    min-height: 3rem;
    padding: 0 var(--gw-space-6);
    font-size: var(--gw-font-size-m);
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
    border-radius: var(--gw-radius-pill);
  }

  .button:disabled,
  .button[aria-disabled="true"] {
    opacity: 0.5;
    cursor: not-allowed;
    pointer-events: none;
  }

  .button.plain:disabled,
  .button.plain[aria-disabled="true"] {
    color: var(--gw-color-text-secondary);
  }

  /* Matches the icon it stands in for */
  gw-spinner {
    --gw-spinner-size: var(--sb-icon-size, 1.25rem);
    color: currentColor;
  }

  /* Fields */
  .field {
    display: flex;
    flex-direction: column;
    gap: calc(var(--gw-space-1) * 1.5);
  }

  .field > label,
  .label {
    font-size: var(--gw-font-size-s);
    font-weight: var(--gw-font-weight-strong);
  }

  .hint {
    font-size: var(--gw-font-size-xs);
    color: var(--gw-color-text-secondary);
  }

  .error-text {
    font-size: var(--gw-font-size-xs);
    color: var(--gw-color-danger);
  }

  .input {
    width: 100%;
    min-height: 2.5rem;
    padding: 0 var(--gw-space-3);
    font: inherit;
    font-size: var(--gw-font-size-s);
    color: var(--gw-color-text-primary);
    background: var(--gw-color-surface-lower);
    border: 1px solid var(--gw-color-border-normal);
    border-radius: var(--gw-radius-m);
    transition: border-color var(--gw-motion-fast) var(--gw-motion-easing);
  }

  .input::placeholder {
    color: color-mix(in oklab, var(--gw-color-text-secondary) 80%, transparent);
  }

  .input:hover {
    border-color: color-mix(
      in oklab,
      var(--gw-color-border-normal),
      var(--gw-color-text-primary) 20%
    );
  }

  .input:focus-visible {
    outline: none;
    border-color: var(--gw-color-accent);
    box-shadow: 0 0 0 3px var(--gw-color-fill-accent-quiet);
  }

  .input[aria-invalid="true"] {
    border-color: var(--gw-color-danger);
  }

  .input:disabled {
    opacity: 0.6;
  }

  .checkbox {
    width: 1.125rem;
    height: 1.125rem;
    margin: 0;
    accent-color: var(--gw-color-accent);
  }

  /* Cards */
  .card {
    display: flex;
    flex-direction: column;
    gap: var(--gw-space-4);
    padding: var(--gw-space-5);
    background: var(--gw-color-surface-raised);
    border: 1px solid var(--gw-color-border-normal);
    border-radius: var(--gw-radius-l);
  }

  .card.flush {
    padding: 0;
    overflow: hidden;
  }

  a.card {
    color: inherit;
    text-decoration: none;
    transition: border-color var(--gw-motion-fast) var(--gw-motion-easing);
  }

  a.card:hover {
    border-color: color-mix(
      in oklab,
      var(--gw-color-accent) 50%,
      var(--gw-color-border-normal)
    );
  }

  /* Label and value pairs */
  dl.facts {
    display: grid;
    grid-template-columns: minmax(7rem, max-content) 1fr;
    gap: var(--gw-space-2) var(--gw-space-4);
    margin: 0;
    font-size: var(--gw-font-size-s);
  }

  dl.facts dt {
    color: var(--gw-color-text-secondary);
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
    gap: var(--gw-space-6);
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
    gap: var(--gw-space-4);
    max-width: none;
    margin: 0;
  }

  :host([embedded]) .page-header .tile {
    width: 2.5rem;
    height: 2.5rem;
    border-radius: var(--gw-radius-m);
    --sb-icon-size: 1.375rem;
  }

  :host([embedded]) .page-header h2 {
    font-size: var(--gw-font-size-l);
  }

  .page-header {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--gw-space-4);
  }

  .page-header .tile {
    display: grid;
    place-items: center;
    width: 3rem;
    height: 3rem;
    color: var(--gw-color-accent);
    background: var(--gw-color-fill-accent-quiet);
    border-radius: var(--gw-radius-l);
    --sb-icon-size: 1.625rem;
  }

  .page-header .titles {
    display: flex;
    flex: 1;
    flex-direction: column;
    gap: var(--gw-space-1);
    min-width: min(100%, 14rem);
  }

  .page-header .description {
    font-size: var(--gw-font-size-s);
    color: var(--gw-color-text-secondary);
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
    gap: var(--gw-space-2);
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
    font-size: var(--gw-font-size-xs);
    font-weight: var(--gw-font-weight-strong);
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: var(--gw-color-text-secondary);
  }
`;
