import { mdiPlay } from "@mdi/js";
import type {
  ServiceAction,
  ServiceActionResult,
  ServiceItem,
} from "@timmo001/effect-system-bridge";
import { AsyncResult } from "effect/reactivity";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators.js";

import "@timmo001/groundwork-ui/define/gw-action-button.ts";
import "@timmo001/groundwork-ui/define/gw-button.ts";
import "@timmo001/groundwork-ui/define/gw-chip.ts";
import "@timmo001/groundwork-ui/define/gw-dialog.ts";
import { shared } from "./shared-styles";
import { AtomController } from "~/lit-effect/atom-controller";
import {
  registry,
  runAction,
  serviceAction,
  serviceActionResults,
} from "~/lib/atoms";

const actionKey = (item: ServiceItem, action: ServiceAction) =>
  `${item.provider}\n${item.id}\n${action.id}`;

/**
 * A services item's actions, and how its last one went, whichever client
 * ran it. An action with a question asks it first; a disabled one says why.
 */
@customElement("sb-service-actions")
export class SbServiceActions extends LitElement {
  static override styles = [
    shared,
    css`
      :host {
        display: flex;
        flex-direction: column;
        gap: var(--gw-space-2);
      }

      .actions {
        display: flex;
        flex-wrap: wrap;
        gap: var(--gw-space-2);
      }

      pre {
        margin: 0;
        max-height: 12rem;
        padding: var(--gw-space-3);
        overflow: auto;
        font-size: var(--gw-font-size-xs);
        white-space: pre-wrap;
        background: var(--gw-color-surface-raised);
        border: 1px solid var(--gw-color-border-normal);
        border-radius: var(--gw-radius-m);
      }
    `,
  ];

  @property({ attribute: false }) item: ServiceItem | null = null;

  /** The action whose question is showing. */
  @state() private confirming: ServiceAction | null = null;

  readonly #results = new AtomController(this, () => serviceActionResults);

  /**
   * Runs an action as `gw-action-button`'s `action`. One that ran but failed
   * rejects too, so the button says so.
   */
  #run = (item: ServiceItem, action: ServiceAction) => async () => {
    const atom = serviceAction(actionKey(item, action));

    await runAction(atom)();

    const result = registry.get(atom);

    if (AsyncResult.isSuccess(result) && !result.value.ok) {
      throw new Error(result.value.summary);
    }
  };

  #ask = (action: ServiceAction) => () => {
    this.confirming = action;
  };

  #closeQuestion = () => {
    this.confirming = null;
  };

  #renderAction(item: ServiceItem, action: ServiceAction) {
    if (action.disabled !== null) {
      return html`<gw-button
        size="small"
        appearance="outlined"
        disabled
        title=${action.disabled}
        >${action.label}</gw-button
      >`;
    }

    if (action.confirm !== null) {
      return html`<gw-button
        size="small"
        appearance="outlined"
        @click=${this.#ask(action)}
        >${action.label}</gw-button
      >`;
    }

    return html`<gw-action-button
      size="small"
      appearance="outlined"
      .action=${this.#run(item, action)}
      >${action.label}</gw-action-button
    >`;
  }

  #renderQuestion(item: ServiceItem) {
    const action = this.confirming;

    if (action === null) return nothing;

    return html`<gw-dialog
      heading=${action.label}
      open
      @close=${this.#closeQuestion}
    >
      <p>${action.confirm}</p>
      <gw-button
        slot="actions"
        variant="neutral"
        appearance="plain"
        @click=${this.#closeQuestion}
        >Cancel</gw-button
      >
      <gw-action-button
        slot="actions"
        icon=${mdiPlay}
        .action=${this.#run(item, action)}
        @done=${this.#closeQuestion}
        >${action.label}</gw-action-button
      >
    </gw-dialog>`;
  }

  #renderResult(result: ServiceActionResult | undefined) {
    if (result === undefined) return nothing;

    const label =
      this.item?.actions.find((action) => action.id === result.action)?.label ??
      result.action;

    return html`
      <gw-chip
        size="small"
        tone=${result.ok ? "success" : "danger"}
        style="align-self: start"
        >${label}: ${result.summary}</gw-chip
      >
      ${result.output === "" ? nothing : html`<pre>${result.output}</pre>`}
    `;
  }

  override render() {
    const item = this.item;

    if (item === null || item.actions.length === 0) return nothing;

    const actions = item.actions.map((action) =>
      this.#renderAction(item, action),
    );

    const result = AsyncResult.getOrElse(
      this.#results.value,
      (): ReadonlyMap<string, ServiceActionResult> => new Map(),
    ).get(`${item.provider}\n${item.id}`);

    return html`
      <div class="actions">${actions}</div>
      ${this.#renderResult(result)} ${this.#renderQuestion(item)}
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "sb-service-actions": SbServiceActions;
  }
}
