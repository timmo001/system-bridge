import { css, html, svg } from "lit";

import "@timmo001/groundwork-ui/gw-chip.ts";
import "@timmo001/groundwork-ui/gw-dot.ts";

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
 * Styles every component shares: type, icons, layout helpers and the few
 * field hints the Groundwork components don't cover.
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

  /* Fields */
  .hint {
    font-size: var(--gw-font-size-xs);
    color: var(--gw-color-text-secondary);
  }

  .error-text {
    font-size: var(--gw-font-size-xs);
    color: var(--gw-color-danger);
  }

  .checkbox {
    width: 1.125rem;
    height: 1.125rem;
    margin: 0;
    accent-color: var(--gw-color-accent);
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

  /* The controls a page header holds */
  gw-page-header > .actions {
    display: flex;
    align-items: center;
    gap: var(--gw-space-2);
  }
`;
