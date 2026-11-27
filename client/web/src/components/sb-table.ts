import "@timmo001/groundwork-ui/define/gw-table.ts";
import { GwTable } from "@timmo001/groundwork-ui/gw-table.ts";
import { render, type TemplateResult } from "lit";

/**
 * What a column's cell shows, from a Lit template. `gw-table` takes a node,
 * and draws a row's cells again as it scrolls by, so each call renders anew.
 */
export const cell = (content: TemplateResult | string): Node => {
  const fragment = document.createDocumentFragment();

  render(content, fragment);

  return fragment;
};

/**
 * The few layout and text classes cells use from the shared styles, which
 * don't reach into `gw-table`'s shadow root otherwise.
 */
const cellStyles = new CSSStyleSheet();

cellStyles.replaceSync(`
  .muted {
    color: var(--gw-color-text-secondary);
  }

  .xsmall {
    font-size: var(--gw-font-size-xs);
  }

  .mono {
    font-family: var(--gw-font-mono);
  }

  .row {
    display: flex;
    align-items: center;
    gap: var(--gw-space-2);
  }

  .wrap {
    flex-wrap: wrap;
  }

  a {
    color: var(--gw-color-accent);
  }
`);

/**
 * Groundwork's `gw-table`, with the shared cell classes, so columns can draw
 * their cells as the rest of the app does.
 */
export class SbTable extends GwTable {
  static override styles = [...GwTable.styles, cellStyles];
}

SbTable.define("sb-table");

declare global {
  interface HTMLElementTagNameMap {
    "sb-table": SbTable;
  }
}
