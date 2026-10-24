import { mdiCogOutline, mdiContentSave } from "@mdi/js";
import { LogLevel, type Settings } from "@timmo001/effect-system-bridge";
import { Schema, Struct } from "effect";
import { html } from "lit";
import { customElement, state } from "lit/decorators.js";

import "~/components/sb-select";
import { icon, spinner } from "~/components/shared-styles";

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
      </div>
    `;
  }
}

const placeholder = html`<span
  class="skeleton"
  style="min-height: 18rem; border-radius: var(--sb-radius-l)"
></span>`;

declare global {
  interface HTMLElementTagNameMap {
    "page-settings": PageSettings;
  }
}
