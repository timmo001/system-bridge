import { mdiFolderOpenOutline, mdiOpenInNew, mdiWeb } from "@mdi/js";
import { html } from "lit";
import { customElement, property, state } from "lit/decorators.js";

import "~/components/sb-segmented";
import { icon, spinner } from "~/components/shared-styles";
import { AtomController } from "~/controllers/atom-controller";
import { actionResult, open, registry } from "~/lib/atoms";
import { href, type LocationOf, type OpenTargetType } from "~/lib/router";

import { SbPage } from "./sb-page";

const kinds: Readonly<
  Record<
    OpenTargetType,
    {
      readonly label: string;
      readonly placeholder: string;
      readonly hint: string;
      readonly done: string;
    }
  >
> = {
  url: {
    label: "URL",
    placeholder: "https://example.com",
    hint: "Opened in the system's default browser.",
    done: "The URL was opened in the default browser.",
  },
  path: {
    label: "Path",
    placeholder: "/path/to/file/or/folder",
    hint: "Opened with the system's default app for it.",
    done: "The path was opened with its default app.",
  },
};

/** URL is the default, so it keeps the search empty. */
const kindOptions = (["url", "path"] as const).map((value) => ({
  value,
  label: kinds[value].label,
  icon: value === "url" ? mdiWeb : mdiFolderOpenOutline,
  href: href("open", {
    search: { type: value === "url" ? undefined : value },
  }),
}));

/**
 * Open a URL or a file on this system. Whether it's a URL or a path is in
 * the search, so a link can go straight to either.
 */
@customElement("page-open")
export class PageOpen extends SbPage {
  @property({ attribute: false }) location!: LocationOf<"open">;

  readonly #open = new AtomController(this, () => open);

  @state() private values: Readonly<Record<OpenTargetType, string>> = {
    url: "",
    path: "",
  };

  @state() private opened: OpenTargetType = "url";

  protected readonly pageTitle = "Open";

  #onSubmit = (event: SubmitEvent) => {
    event.preventDefault();

    const kind = this.location.search.type ?? "url";
    const value = this.values[kind].trim();

    if (value === "") return;

    this.opened = kind;
    registry.set(open, kind === "url" ? { url: value } : { path: value });
  };

  #onInput = (event: InputEvent) => {
    if (event.target instanceof HTMLInputElement) {
      const kind = this.location.search.type ?? "url";

      this.values = { ...this.values, [kind]: event.target.value };
    }
  };

  #renderForm(kind: OpenTargetType) {
    const sending = this.#open.value.waiting;
    const info = kinds[kind];

    return html`
      <form class="card" @submit=${this.#onSubmit}>
        <sb-segmented
          label="What to open"
          .options=${kindOptions}
          .value=${kind}
        ></sb-segmented>
        <div class="field">
          <label for="target">${info.label}</label>
          <input
            class="input"
            id="target"
            placeholder=${info.placeholder}
            required
            ?disabled=${sending}
            .value=${this.values[kind]}
            @input=${this.#onInput}
          />
          <span class="hint">${info.hint}</span>
        </div>
        <div class="row" style="justify-content: flex-end">
          <button
            class="button filled"
            type="submit"
            ?disabled=${sending || this.values[kind].trim() === ""}
          >
            ${sending ? spinner() : icon(mdiOpenInNew)} Open
          </button>
        </div>
      </form>
    `;
  }

  override render() {
    const kind = this.location.search.type ?? "url";

    return html`
      <div class="page narrow">
        ${this.renderHeader({
          heading: "Open",
          description:
            "Open a URL in the browser, or a file or folder with its app",
          icon: mdiOpenInNew,
        })}
        ${this.renderResult(
          actionResult(this.#open.value, kinds[this.opened].done),
        )}
        ${this.gate(
          () => this.#renderForm(kind),
          html`<span
            class="skeleton"
            style="min-height: 15rem; border-radius: var(--sb-radius-l)"
          ></span>`,
        )}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "page-open": PageOpen;
  }
}
