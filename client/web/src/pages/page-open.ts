import { mdiFolderOpenOutline, mdiOpenInNew, mdiWeb } from "@mdi/js";
import { Schema } from "effect";
import { html } from "lit";
import { customElement, state } from "lit/decorators.js";

import "@timmo001/groundwork-ui/gw-segmented.ts";
import { selectValue } from "~/lib/select";
import { AtomController } from "~/controllers/atom-controller";
import { actionResult, open, registry } from "~/lib/atoms";

import { SbPage } from "./sb-page";

const OpenTargetType = Schema.Literals(["url", "path"]);

type OpenTargetType = typeof OpenTargetType.Type;

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

const kindOptions = (["url", "path"] as const).map((value) => ({
  value,
  label: kinds[value].label,
  icon: value === "url" ? mdiWeb : mdiFolderOpenOutline,
}));

const isOpenTargetType = Schema.is(OpenTargetType);

/** Open a URL or a file on this system. */
@customElement("page-open")
export class PageOpen extends SbPage {
  readonly #open = new AtomController(this, () => open);

  @state() private kind: OpenTargetType = "url";

  @state() private values: Readonly<Record<OpenTargetType, string>> = {
    url: "",
    path: "",
  };

  @state() private opened: OpenTargetType = "url";

  protected readonly pageTitle = "Open";

  #onKindChange = (event: Event) => {
    const value = selectValue(event);

    if (isOpenTargetType(value)) this.kind = value;
  };

  #onSubmit = (event: SubmitEvent) => {
    event.preventDefault();

    const kind = this.kind;
    const value = this.values[kind].trim();

    if (value === "") return;

    this.opened = kind;
    registry.set(open, kind === "url" ? { url: value } : { path: value });
  };

  #onInput = (event: InputEvent) => {
    if (event.target instanceof HTMLInputElement) {
      this.values = { ...this.values, [this.kind]: event.target.value };
    }
  };

  #renderForm(kind: OpenTargetType) {
    const sending = this.#open.value.waiting;
    const info = kinds[kind];

    return html`
      <form @submit=${this.#onSubmit}>
        <gw-card>
          <div class="stack">
            <gw-segmented
              label="What to open"
              size="small"
              .options=${kindOptions}
              .value=${kind}
              @change=${this.#onKindChange}
            ></gw-segmented>
            <gw-input
              label=${info.label}
              placeholder=${info.placeholder}
              hint=${info.hint}
              required
              ?disabled=${sending}
              .value=${this.values[kind]}
              @input=${this.#onInput}
            ></gw-input>
          </div>
          <div slot="footer" class="row" style="justify-content: flex-end">
            <gw-button
              type="submit"
              icon=${mdiOpenInNew}
              ?loading=${sending}
              ?disabled=${this.values[kind].trim() === ""}
              >Open</gw-button
            >
          </div>
        </gw-card>
      </form>
    `;
  }

  override render() {
    const kind = this.kind;

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
          html`<gw-skeleton
            style="min-height: 15rem; border-radius: var(--gw-radius-l)"
          ></gw-skeleton>`,
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
