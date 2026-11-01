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
import { html } from "lit";
import { customElement, state } from "lit/decorators.js";

import "@timmo001/groundwork-ui/gw-button.ts";
import "@timmo001/groundwork-ui/gw-card.ts";
import { icon } from "~/components/shared-styles";
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

  /** Each remove button's `data-path` is its directory's path. */
  #onRemove = (event: MouseEvent) => {
    const current = this.settings;

    const path =
      event.currentTarget instanceof HTMLElement
        ? event.currentTarget.dataset.path
        : undefined;

    if (current === undefined || path === undefined) return;

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
          <gw-button
            variant="danger"
            appearance="plain"
            size="small"
            labels="hide"
            icon=${mdiTrashCanOutline}
            data-path=${directory.path}
            ?disabled=${busy}
            @click=${this.#onRemove}
            >Remove ${directory.name}</gw-button
          >
        </li>`,
    );

    return html`
      <gw-card
        level=${this.cardLevel}
        heading="Add a directory"
        description="It must already exist"
      >
        <form class="stack" @submit=${this.#onSubmit}>
          <div class="grid" style="--sb-grid-min: 14rem">
            <gw-input
              label="Name"
              name="name"
              placeholder="Music"
              required
              ?disabled=${busy}
              .value=${this.name}
              @input=${this.#onNameInput}
            ></gw-input>
            <gw-input
              label="Path"
              name="path"
              placeholder="/home/me/Music"
              required
              monospace
              error=${addResult?.success === false ? addResult.message : ""}
              ?disabled=${busy}
              .value=${this.path}
              @input=${this.#onPathInput}
            ></gw-input>
          </div>
          <div class="row" style="justify-content: flex-end">
            <gw-button
              type="submit"
              icon=${mdiPlus}
              ?loading=${busy}
              ?disabled=${this.name.trim() === "" || this.path.trim() === ""}
              >Add</gw-button
            >
          </div>
        </form>
      </gw-card>
      <gw-card
        level=${this.cardLevel}
        heading="Directories"
        description="${this.directories.length} shared"
      >
        ${
          this.directories.length === 0
            ? html`<gw-empty-state icon=${mdiFolderMultipleOutline}>
                <p>No directories yet. Add one above.</p>
              </gw-empty-state>`
            : html`<ul
                class="stack"
                style="margin: 0; padding: 0; list-style: none; --sb-stack-gap: var(--gw-space-2)"
              >
                ${directories}
              </ul>`
        }
      </gw-card>
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
          html`<gw-skeleton
            style="min-height: 24rem; border-radius: var(--gw-radius-l)"
          ></gw-skeleton>`,
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
