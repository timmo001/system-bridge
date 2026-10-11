import type {
  Settings,
  SettingsMediaDirectory,
} from "@timmo001/effect-system-bridge";
import { Struct } from "effect";
import { html } from "lit";
import { customElement, state } from "lit/decorators.js";

import { AtomController } from "~/controllers/atom-controller";
import { actionResult, addMediaDirectory, registry } from "~/lib/atoms";
import { SettingsPageElement } from "~/mixins/settings-page";
import "../components/ui/button";
import "../components/ui/connection-indicator";
import "../components/ui/connection-required";
import "../components/ui/icon";
import "../components/ui/input";
import "../components/ui/label";

@customElement("page-settings-media")
class PageSettingsMedia extends SettingsPageElement {
  title = "Media Directories";
  description = "Manage directories for media scanning";

  readonly #add = new AtomController(this, () => addMediaDirectory);

  @state()
  private mediaDirectories: readonly SettingsMediaDirectory[] = [];

  @state()
  private newDirectoryName = "";

  @state()
  private newDirectoryPath = "";

  private get isValidating(): boolean {
    return this.#add.value.waiting;
  }

  private get isSubmitting(): boolean {
    return this.isSaving;
  }

  private get validationError(): string | null {
    const result = actionResult(this.#add.value, "");

    return result && !result.success ? result.message : null;
  }

  protected settingsLoaded(settings: Settings): void {
    this.mediaDirectories = settings.media.directories;

    const added = this.newDirectoryPath.trim();

    if (added && this.mediaDirectories.some((d) => d.path === added)) {
      this.newDirectoryName = "";
      this.newDirectoryPath = "";
    }
  }

  private handleNavigateToConnection = (): void => {
    this.navigate("/connection");
  };

  private handleNameInput = (e: Event & { target: HTMLInputElement }): void => {
    this.newDirectoryName = e.target.value;
  };

  private handlePathInput = (e: Event & { target: HTMLInputElement }): void => {
    this.newDirectoryPath = e.target.value;
  };

  private handleAddDirectory = (): void => {
    const name = this.newDirectoryName.trim();
    const path = this.newDirectoryPath.trim();

    if (!name || !path) return;

    registry.set(addMediaDirectory, { name, path });
  };

  private handleRemoveDirectory = (
    e: Event & { currentTarget: HTMLElement },
  ): void => {
    const path = e.currentTarget.getAttribute("data-path");
    const current = this.settings;

    if (!path || !current) return;

    this.mediaDirectories = this.mediaDirectories.filter(
      (d) => d.path !== path,
    );
    this.saveSettings(
      Struct.assign(current, {
        media: { directories: this.mediaDirectories },
      }),
    );
  };

  private renderDirectoryItem(dir: SettingsMediaDirectory) {
    return html`
      <div class="flex items-center gap-4 p-3 rounded-md border">
        <div class="flex-1 space-y-1">
          <div class="font-medium">${dir.name}</div>
          <div class="text-sm text-muted-foreground break-all">${dir.path}</div>
        </div>
        <ui-button
          variant="destructive"
          size="sm"
          data-path=${dir.path}
          @click=${this.handleRemoveDirectory}
          ?disabled=${this.isSubmitting}
        >
          <ui-icon name="Trash2"></ui-icon>
        </ui-button>
      </div>
    `;
  }

  private renderDirectoryList() {
    if (this.mediaDirectories.length === 0) {
      return html`
        <div
          class="text-sm text-muted-foreground italic p-4 text-center border rounded-md"
        >
          No media directories configured
        </div>
      `;
    }

    const directoryItems = this.mediaDirectories.map((dir) =>
      this.renderDirectoryItem(dir),
    );

    return html` <div class="space-y-2">${directoryItems}</div> `;
  }

  private renderAddDirectoryForm() {
    return html`
      <div class="rounded-lg border bg-card p-6 space-y-4">
        <h2 class="text-xl font-semibold">Add Directory</h2>
        <p class="text-sm text-muted-foreground">
          Add directories to be used for media scanning. Only existing
          directories are allowed.
        </p>

        <div class="flex gap-2">
          <div class="flex-1">
            <ui-label>Name</ui-label>
            <ui-input
              placeholder="Enter directory name"
              .value=${this.newDirectoryName}
              @input=${this.handleNameInput}
              ?disabled=${this.isValidating || this.isSubmitting}
            ></ui-input>
          </div>
          <div class="flex-1">
            <ui-label>Path</ui-label>
            <ui-input
              placeholder="Enter directory path"
              .value=${this.newDirectoryPath}
              @input=${this.handlePathInput}
              ?disabled=${this.isValidating || this.isSubmitting}
            ></ui-input>
          </div>
          <div class="self-end">
            <ui-button
              variant="secondary"
              @click=${this.handleAddDirectory}
              ?disabled=${
                this.isValidating ||
                this.isSubmitting ||
                !this.newDirectoryName.trim() ||
                !this.newDirectoryPath.trim()
              }
            >
              ${this.isValidating ? "Validating..." : "Add"}
            </ui-button>
          </div>
        </div>

        ${
          this.validationError
            ? html`
                <div class="text-sm text-destructive">
                  ${this.validationError}
                </div>
              `
            : ""
        }
      </div>
    `;
  }

  render() {
    const isConnected = this.status?.isConnected ?? false;

    return html`
      <div class="min-h-screen bg-background text-foreground p-8">
        <div class="max-w-4xl mx-auto space-y-6">
          ${this.renderPageHeader()}
          ${this.renderWithConnection(
            isConnected,
            "Please connect to System Bridge to manage media directories.",
            this.handleNavigateToConnection,
            html`
              <div class="space-y-6">
                ${this.renderAddDirectoryForm()}

                <div class="rounded-lg border bg-card p-6 space-y-4">
                  <h2 class="text-xl font-semibold">
                    Directories
                    ${
                      this.mediaDirectories.length > 0
                        ? `(${this.mediaDirectories.length})`
                        : ""
                    }
                  </h2>
                  ${this.renderDirectoryList()}
                </div>
              </div>
            `,
          )}
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "page-settings-media": PageSettingsMedia;
  }
}
