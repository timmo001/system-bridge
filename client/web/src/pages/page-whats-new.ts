import { mdiNewBox, mdiRefresh } from "@mdi/js";
import "@timmo001/groundwork-ui/define/gw-markdown.ts";
import { Option } from "effect";
import { AsyncResult } from "effect/reactivity";
import { css, html, nothing } from "lit";
import { customElement } from "lit/decorators.js";

import { AtomController } from "~/controllers/atom-controller";
import { registry } from "~/lib/atoms";
import {
  linkReferences,
  type Release,
  type Releases,
  releases,
} from "~/lib/releases";

import { SbPage } from "./sb-page";

const date = new Intl.DateTimeFormat(undefined, { dateStyle: "medium" });

const retry = () => registry.refresh(releases);

const placeholder = html`<gw-card loading lines="8"></gw-card>`;

/**
 * The newest System Bridge releases, newest first, each with its notes, and
 * which of them are newer than the computer's version.
 */
@customElement("page-whats-new")
export class PageWhatsNew extends SbPage {
  static override styles = [
    ...SbPage.styles,
    css`
      .chips {
        display: flex;
        flex-wrap: wrap;
        gap: var(--gw-space-1);
      }
    `,
  ];

  protected readonly pageTitle = "What's new";

  readonly #releases = new AtomController(this, () => releases);

  #renderSummary({ version, releases: list }: Releases) {
    const newer = list.filter((release) => release.newer).length;

    if (newer === 0) {
      return html`<p class="muted small">
        This computer has
        ${version}${
          list.some((release) => release.installed)
            ? ", the newest release."
            : "."
        }
      </p>`;
    }

    return html`<gw-alert
      tone="info"
      heading=${
        newer === 1 ? "1 release is newer" : `${newer} releases are newer`
      }
    >
      This computer has ${version}. Here's what changed since.
    </gw-alert>`;
  }

  #renderRelease(release: Release) {
    return html`
      <gw-card
        heading=${release.name}
        description=${date.format(new Date(release.publishedAt))}
        level=${this.cardLevel}
      >
        ${
          release.newer || release.installed
            ? html`<div slot="actions" class="chips">
                ${
                  release.newer
                    ? html`<gw-chip tone="accent" size="small">New</gw-chip>`
                    : nothing
                }
                ${
                  release.installed
                    ? html`<gw-chip tone="success" size="small"
                        >You have this</gw-chip
                      >`
                    : nothing
                }
              </div>`
            : nothing
        }
        <gw-markdown content=${linkReferences(release.notes)}></gw-markdown>
        <a
          slot="footer"
          class="small"
          href=${release.url}
          target="_blank"
          rel="noopener noreferrer"
          >${release.name} on GitHub</a
        >
      </gw-card>
    `;
  }

  #renderContent() {
    const result = this.#releases.value;

    if (AsyncResult.isFailure(result)) {
      return html`<gw-alert tone="danger" heading="Couldn't load the releases">
        ${Option.match(AsyncResult.error(result), {
          onNone: () => "Something went wrong",
          onSome: (error) => error.message,
        })}
        <gw-button
          slot="actions"
          icon=${mdiRefresh}
          ?loading=${result.waiting}
          @click=${retry}
          >Try again</gw-button
        >
      </gw-alert>`;
    }

    return Option.match(AsyncResult.value(result), {
      onNone: () => placeholder,
      onSome: (data) => {
        const cards = data.releases.map((release) =>
          this.#renderRelease(release),
        );

        return html`
          ${this.#renderSummary(data)} ${cards}
          <a
            class="small"
            href=${data.more}
            target="_blank"
            rel="noopener noreferrer"
            >Older releases on GitHub</a
          >
        `;
      },
    });
  }

  override render() {
    return html`
      <div class="page narrow">
        ${this.renderHeader({
          heading: "What's new",
          description: "The newest System Bridge releases, and what changed",
          icon: mdiNewBox,
        })}
        ${this.gate(() => this.#renderContent(), placeholder)}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "page-whats-new": PageWhatsNew;
  }
}
