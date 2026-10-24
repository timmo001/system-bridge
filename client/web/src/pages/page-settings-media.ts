import {
  mdiFolderMultipleOutline,
  mdiFolderOutline,
  mdiPlus,
  mdiTrashCanOutline,
} from "@mdi/js";
import type {
  Settings,
  SettingsMediaDirectory,
} from "@timmo001/effect-system-bridge";
import { Struct } from "effect";
import { html, nothing } from "lit";
import { customElement, state } from "lit/decorators.js";

import "~/components/sb-card";
import { icon, spinner } from "~/components/shared-styles";
import { AtomController } from "~/controllers/atom-controller";
import { actionResult, addMediaDirectory, registry } from "~/lib/atoms";

import { SbSettingsPage } from "./sb-settings-page";

/** Folders whose media System Bridge can list and serve. */
@customElement("page-settings-media")
export class PageSettingsMedia extends SbSettingsPage {
  readonly #add = new AtomController(this, () => addMediaDirectory);

  @state() private directories: readonly SettingsMediaDirectory[] = [];

  @state() private name = "";

  @state() private path = "";

  protected readonly pageTitle = "Media directories";

  protected settingsLoaded(settings: Settings): void {
    this.directories = settings.media.directories;

    const added = this.path.trim();

    if (added !== "" && this.directories.some((d) => d.path === added)) {
      this.name = "";
      this.path = "";
    }
  }

  #onSubmit = (event: SubmitEvent) => {
    event.preventDefault();

    const name = this.name.trim();
    const path = this.path.trim();

    if (name !== "" && path !== "") {
      registry.set(addMediaDirectory, { name, path });
    }
  };

  /** Each remove button's value is its directory's path. */
  #onRemove = (event: MouseEvent) => {
    const current = this.settings;

    if (
      current === undefined ||
      !(event.currentTarget instanceof HTMLButtonElement)
    ) {
      return;
    }

    const path = event.currentTarget.value;

    this.saveSettings(
      Struct.assign(current, {
        media: {
          directories: this.directories.filter((d) => d.path !== path),
        },
      }),
    );
  };

  #onNameInput = (event: InputEvent) => {
    if (event.target instanceof HTMLInputElement) {
      this.name = event.target.value;
    }
  };

  #onPathInput = (event: InputEvent) => {
    if (event.target instanceof HTMLInputElement) {
      this.path = event.target.value;
    }
  };

  #renderContent() {
    const busy = this.#add.value.waiting || this.isSaving;
    const addResult = actionResult(this.#add.value, "");

    const directories = this.directories.map(
      (directory) =>
        html`<li class="row">
          ${icon(mdiFolderOutline)}
          <span class="stack" style="flex: 1; min-width: 0; --sb-stack-gap: 0">
            <strong class="small">${directory.name}</strong>
            <span class="muted xsmall mono break">${directory.path}</span>
          </span>
          <button
            class="button danger small icon-only"
            type="button"
            aria-label="Remove ${directory.name}"
            title="Remove"
            value=${directory.path}
            ?disabled=${busy}
            @click=${this.#onRemove}
          >
            ${icon(mdiTrashCanOutline)}
          </button>
        </li>`,
    );

    return html`
      <sb-card heading="Add a directory" subheading="It must already exist">
        <form class="stack" @submit=${this.#onSubmit}>
          <div class="grid" style="--sb-grid-min: 14rem">
            <div class="field">
              <label for="name">Name</label>
              <input
                class="input"
                id="name"
                placeholder="Music"
                required
                ?disabled=${busy}
                .value=${this.name}
                @input=${this.#onNameInput}
              />
            </div>
            <div class="field">
              <label for="path">Path</label>
              <input
                class="input mono"
                id="path"
                placeholder="/home/me/Music"
                required
                aria-invalid=${addResult?.success === false ? "true" : nothing}
                aria-describedby=${
                  addResult?.success === false ? "add-error" : nothing
                }
                ?disabled=${busy}
                .value=${this.path}
                @input=${this.#onPathInput}
              />
            </div>
          </div>
          ${
            addResult?.success === false
              ? html`<span class="error-text" id="add-error" role="alert"
                  >${addResult.message}</span
                >`
              : nothing
          }
          <div class="row" style="justify-content: flex-end">
            <button
              class="button filled"
              type="submit"
              ?disabled=${busy || this.name.trim() === "" || this.path.trim() === ""}
            >
              ${busy ? spinner() : icon(mdiPlus)} Add
            </button>
          </div>
        </form>
      </sb-card>
      <sb-card
        heading="Directories"
        subheading="${this.directories.length} shared"
      >
        ${
          this.directories.length === 0
            ? html`<div class="empty">
                ${icon(mdiFolderMultipleOutline)}
                <p>No directories yet. Add one above.</p>
              </div>`
            : html`<ul
                class="stack"
                style="margin: 0; padding: 0; list-style: none; --sb-stack-gap: var(--sb-space-2)"
              >
                ${directories}
              </ul>`
        }
      </sb-card>
    `;
  }

  override render() {
    return html`
      <div class="page narrow">
        ${this.renderHeader({
          heading: "Media directories",
          description: "Folders whose media System Bridge can list and serve",
          icon: mdiFolderMultipleOutline,
        })}
        ${this.renderResult(this.saveResult)}
        ${this.gate(
          () => this.#renderContent(),
          html`<span
            class="skeleton"
            style="min-height: 24rem; border-radius: var(--sb-radius-l)"
          ></span>`,
        )}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "page-settings-media": PageSettingsMedia;
  }
}
