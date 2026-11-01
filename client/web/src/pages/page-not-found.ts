import { mdiMapMarkerQuestionOutline } from "@mdi/js";
import { html } from "lit";
import { customElement, property } from "lit/decorators.js";

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
        <gw-card>
          <gw-empty-state
            icon=${mdiMapMarkerQuestionOutline}
            heading="There's no page here"
          >
            <p><code>${this.path}</code> isn't part of System Bridge.</p>
            <gw-button slot="actions" href=${href("overview")}
              >Go to the overview</gw-button
            >
          </gw-empty-state>
        </gw-card>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "page-not-found": PageNotFound;
  }
}
