import {
  mdiApplicationOutline,
  mdiCogOutline,
  mdiConsoleLine,
  mdiContentSave,
  mdiFolderMultipleOutline,
  mdiHarddisk,
  mdiHeadset,
  mdiWebcam,
} from "@mdi/js";
import { LogLevel, type Settings } from "@timmo001/effect-system-bridge";
import { Schema, Struct } from "effect";
import { css, html } from "lit";
import { customElement, state } from "lit/decorators.js";

import "~/components/sb-card";
import "~/components/sb-select";
import { icon, spinner } from "~/components/shared-styles";
import { moduleInfo } from "~/lib/navigation";
import { href } from "~/lib/router";

import { SbSettingsPage } from "./sb-settings-page";

const isLogLevel = Schema.is(LogLevel);

const logLevels = [
  {
    value: "DEBUG",
    label: "Debug",
    description: "Everything, for tracking down problems",
  },
  { value: "INFO", label: "Info", description: "What System Bridge is doing" },
  {
    value: "WARN",
    label: "Warning",
    description: "Only things that may need attention",
  },
  { value: "ERROR", label: "Error", description: "Only failures" },
] as const;

/** System Bridge's own behaviour: starting, the tray and logging. */
@customElement("page-settings")
export class PageSettings extends SbSettingsPage {
  static override styles = [
    ...SbSettingsPage.styles,
    css`
      .links {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(min(100%, 14rem), 1fr));
        gap: var(--sb-space-2);
        margin: 0;
        padding: 0;
        list-style: none;
      }

      .links .button {
        justify-content: flex-start;
        width: 100%;
        height: auto;
        padding-block: var(--sb-space-2);
        text-align: start;
      }
    `,
  ];

  @state() private form: Settings | undefined;

  protected readonly pageTitle = "General settings";

  protected settingsLoaded(settings: Settings): void {
    this.form = settings;
  }

  /** The switches are named after the setting they change. */
  #onToggle = (event: Event) => {
    const target = event.target;

    if (this.form === undefined || !(target instanceof HTMLInputElement)) {
      return;
    }

    if (target.name === "autostart") {
      this.form = Struct.assign(this.form, { autostart: target.checked });
    } else if (target.name === "systemTray") {
      this.form = Struct.assign(this.form, { systemTray: target.checked });
    }
  };

  #onLogLevelChange = (event: CustomEvent<{ readonly value: string }>) => {
    const level = event.detail.value;

    if (this.form !== undefined && isLogLevel(level)) {
      this.form = Struct.assign(this.form, { logLevel: level });
    }
  };

  #onSubmit = (event: SubmitEvent) => {
    event.preventDefault();

    if (this.form !== undefined) this.saveSettings(this.form);
  };

  #renderForm() {
    const form = this.form;
    const saving = this.isSaving;

    if (form === undefined) return placeholder;

    return html`
      <form class="card" @submit=${this.#onSubmit}>
        <div>
          <label class="setting">
            <span class="stack" style="--sb-stack-gap: 0">
              <span class="label" id="autostart-label"
                >Start automatically</span
              >
              <span class="hint" id="autostart-hint"
                >Start System Bridge when you sign in.</span
              >
            </span>
            <input
              class="switch"
              type="checkbox"
              role="switch"
              aria-labelledby="autostart-label"
              aria-describedby="autostart-hint"
              name="autostart"
              .checked=${form.autostart}
              ?disabled=${saving}
              @change=${this.#onToggle}
            />
          </label>
          <label class="setting">
            <span class="stack" style="--sb-stack-gap: 0">
              <span class="label" id="tray-label">Show in the system tray</span>
              <span class="hint" id="tray-hint"
                >Hiding takes effect when you save. To show it again, save and
                restart System Bridge. On macOS, hiding also needs a
                restart.</span
              >
            </span>
            <input
              class="switch"
              type="checkbox"
              role="switch"
              aria-labelledby="tray-label"
              aria-describedby="tray-hint"
              name="systemTray"
              .checked=${form.systemTray}
              ?disabled=${saving}
              @change=${this.#onToggle}
            />
          </label>
          <div class="setting">
            <span class="stack" style="--sb-stack-gap: 0">
              <span class="label" id="log-level">Log level</span>
              <span class="hint"
                >How much System Bridge writes to its log.</span
              >
            </span>
            <sb-select
              style="width: 13rem"
              label="Log level"
              search-placeholder="Search levels"
              .options=${logLevels}
              .value=${form.logLevel}
              ?disabled=${saving}
              @value-changed=${this.#onLogLevelChange}
            ></sb-select>
          </div>
        </div>
        <div class="row" style="justify-content: flex-end">
          <button class="button filled" type="submit" ?disabled=${saving}>
            ${saving ? spinner() : icon(mdiContentSave)} Save
          </button>
        </div>
      </form>
    `;
  }

  override render() {
    return html`
      <div class="page narrow">
        ${this.renderHeader({
          heading: "General",
          description: "How System Bridge starts, shows itself and logs",
          icon: mdiCogOutline,
        })}
        ${this.renderResult(this.saveResult)}
        ${this.gate(() => this.#renderForm(), placeholder)}
        <sb-card
          heading="More settings"
          subheading="Kept with the data they change"
        >
          <ul class="links">
            ${elsewhereLinks}
          </ul>
        </sb-card>
      </div>
    `;
  }
}

/** Settings that live with their module's data now. */
const elsewhere = [
  {
    label: "Cameras",
    icon: mdiWebcam,
    module: "cameras",
    section: "camera-capture",
  },
  {
    label: "Commands",
    icon: mdiConsoleLine,
    module: "system",
    section: "commands",
  },
  {
    label: "Discord",
    icon: mdiHeadset,
    module: "discord",
    section: "discord-setup",
  },
  {
    label: "Disk mounts",
    icon: mdiHarddisk,
    module: "disks",
    section: "disk-mounts",
  },
  {
    label: "Media directories",
    icon: mdiFolderMultipleOutline,
    module: "media",
    section: "media-directories",
  },
  {
    label: "Desktop",
    icon: mdiApplicationOutline,
    module: "desktop",
    section: "window-titles",
  },
] as const;

const elsewhereLinks = elsewhere.map(
  (item) =>
    html`<li>
      <a
        class="button plain"
        href=${href("module", {
          params: { module: item.module },
          hash: item.section,
        })}
      >
        ${icon(item.icon)}
        <span class="stack" style="--sb-stack-gap: 0">
          <span>${item.label}</span>
          <span class="hint">On the ${moduleInfo[item.module].label} page</span>
        </span>
      </a>
    </li>`,
);

const placeholder = html`<span
  class="skeleton"
  style="min-height: 18rem; border-radius: var(--sb-radius-l)"
></span>`;

declare global {
  interface HTMLElementTagNameMap {
    "page-settings": PageSettings;
  }
}
