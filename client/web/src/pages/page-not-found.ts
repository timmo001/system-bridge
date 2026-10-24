import { mdiMapMarkerQuestionOutline } from "@mdi/js";
import { html } from "lit";
import { customElement, property } from "lit/decorators.js";

import { icon } from "~/components/shared-styles";
import { href } from "~/lib/router";

import { SbPage } from "./sb-page";

/** Shown for a path that isn't a page. */
@customElement("page-not-found")
export class PageNotFound extends SbPage {
  @property() path = "";

  protected readonly pageTitle = "Not found";

  override render() {
    return html`
      <div class="page narrow">
        <div class="card empty">
          ${icon(mdiMapMarkerQuestionOutline)}
          <h1>There's no page here</h1>
          <p class="muted">
            <code>${this.path}</code> isn't part of System Bridge.
          </p>
          <a class="button filled" href=${href("overview")}
            >Go to the overview</a
          >
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "page-not-found": PageNotFound;
  }
}
