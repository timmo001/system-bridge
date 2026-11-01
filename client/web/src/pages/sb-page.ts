import {
  mdiAlertCircleOutline,
  mdiCheckCircleOutline,
  mdiLanDisconnect,
  mdiRefresh,
} from "@mdi/js";
import { html, LitElement, nothing, type TemplateResult } from "lit";
import { property } from "lit/decorators.js";

import { pageStyles, icon, shared } from "~/components/shared-styles";
import { AtomController } from "~/controllers/atom-controller";
import {
  type ConnectionStatus,
  connectionStatus,
  retryConnection,
} from "~/lib/atoms";
import { documentTitle } from "~/lib/navigation";
import { href } from "~/lib/router";

export interface PageHeader {
  readonly heading: string;
  readonly description?: string;
  /** An `@mdi/js` path for the tile before the heading. */
  readonly icon?: string;
  /** Controls at the end of the header. */
  readonly actions?: TemplateResult;
}

/**
 * The base for every page: shadow DOM with the shared styles, the browser
 * tab's title, a common header, and a gate for content that needs the
 * connection. A page can also be a section of another, such as the commands
 * on the System page.
 */
export abstract class SbPage extends LitElement {
  static override styles = [shared, pageStyles];

  /** Shown as a section of another page: an h2 heading, and no tab title. */
  @property({ type: Boolean, reflect: true }) embedded = false;

  readonly #status = new AtomController(this, () => connectionStatus);

  /** The page's name for the browser tab. */
  protected abstract readonly pageTitle: string;

  /** Cards go a level under the section heading when embedded. */
  protected get cardLevel(): number {
    return this.embedded ? 3 : 2;
  }

  protected get status(): ConnectionStatus {
    return this.#status.value;
  }

  protected override updated(): void {
    if (!this.embedded) document.title = documentTitle(this.pageTitle);
  }

  protected renderHeader(header: PageHeader): TemplateResult {
    return html`
      <header class="page-header">
        ${
          header.icon === undefined
            ? nothing
            : html`<span class="tile">${icon(header.icon)}</span>`
        }
        <div class="titles">
          ${
            this.embedded
              ? html`<h2>${header.heading}</h2>`
              : html`<h1>${header.heading}</h1>`
          }
          ${
            header.description === undefined
              ? nothing
              : html`<p class="description">${header.description}</p>`
          }
        </div>
        ${
          header.actions === undefined
            ? nothing
            : html`<div class="actions">${header.actions}</div>`
        }
      </header>
    `;
  }

  /** The outcome of an action, from `actionResult`. */
  protected renderResult(
    result: { readonly success: boolean; readonly message: string } | null,
    extra?: TemplateResult,
  ): TemplateResult | typeof nothing {
    if (result === null) return nothing;

    return html`
      <div
        class="alert ${result.success ? "success" : "danger"}"
        role=${result.success ? "status" : "alert"}
      >
        ${icon(result.success ? mdiCheckCircleOutline : mdiAlertCircleOutline)}
        <div>
          <strong>${result.success ? "Done" : "That didn't work"}</strong>
          ${result.message} ${extra ?? nothing}
        </div>
      </div>
    `;
  }

  /**
   * Shows `content` once connected. While the connection is still being
   * made, shows `placeholder`, which should take up the same room as the
   * content so nothing moves when it arrives. Only a failed connection shows
   * the prompt to set one up.
   */
  protected gate(
    content: () => TemplateResult,
    placeholder: TemplateResult,
  ): TemplateResult {
    const { isConnected, error } = this.status;

    if (isConnected) return content();

    if (error === null) return placeholder;

    return html`
      <div class="card connection-required" role="alert">
        <span class="tile">${icon(mdiLanDisconnect)}</span>
        <h2>Not connected to System Bridge</h2>
        <p class="muted small">${error}</p>
        <div class="row wrap" style="justify-content: center">
          <a class="button filled" href=${href("connection")}
            >Connection settings</a
          >
          <button class="button" type="button" @click=${retryConnection}>
            ${icon(mdiRefresh)} Retry
          </button>
        </div>
      </div>
    `;
  }
}
