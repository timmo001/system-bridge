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

import "@timmo001/groundwork-ui/gw-card.ts";
import "@timmo001/groundwork-ui/gw-select.ts";
import { selectValue } from "~/lib/select";
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
        gap: var(--gw-space-2);
        margin: 0;
        padding: 0;
        list-style: none;
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

  #onLogLevelChange = (event: Event) => {
    const level = selectValue(event);

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
      <form @submit=${this.#onSubmit}>
        <gw-card>
          <gw-setting-row
            heading="Start automatically"
            description="Start System Bridge when you sign in."
          >
            <gw-switch
              label="Start automatically"
              label-hidden
              name="autostart"
              .checked=${form.autostart}
              ?disabled=${saving}
              @change=${this.#onToggle}
            ></gw-switch>
          </gw-setting-row>
          <gw-setting-row
            heading="Show in the system tray"
            description="Hiding takes effect when you save. To show it again, save and restart System Bridge. On macOS, hiding also needs a restart."
          >
            <gw-switch
              label="Show in the system tray"
              label-hidden
              name="systemTray"
              .checked=${form.systemTray}
              ?disabled=${saving}
              @change=${this.#onToggle}
            ></gw-switch>
          </gw-setting-row>
          <gw-setting-row
            heading="Log level"
            description="How much System Bridge writes to its log."
          >
            <gw-select
              style="width: 18rem"
              label="Log level"
              label-hidden
              .options=${logLevels}
              .value=${form.logLevel}
              ?disabled=${saving}
              @change=${this.#onLogLevelChange}
            ></gw-select>
          </gw-setting-row>
          <div slot="footer" class="row" style="justify-content: flex-end">
            <gw-button type="submit" icon=${mdiContentSave} ?loading=${saving}
              >Save</gw-button
            >
          </div>
        </gw-card>
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
        <gw-card
          heading="More settings"
          description="Kept with the data they change"
        >
          <ul class="links">
            ${elsewhereLinks}
          </ul>
        </gw-card>
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
      <gw-card
        level="3"
        href=${href("module", {
          params: { module: item.module },
          hash: item.section,
        })}
        icon=${item.icon}
        heading=${item.label}
        description="On the ${moduleInfo[item.module].label} page"
      ></gw-card>
    </li>`,
);

const placeholder = html`<gw-skeleton
  style="min-height: 18rem; border-radius: var(--gw-radius-l)"
></gw-skeleton>`;

declare global {
  interface HTMLElementTagNameMap {
    "page-settings": PageSettings;
  }
}
