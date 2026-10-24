import { mdiCodeJson, mdiDownload, mdiFileDelimitedOutline } from "@mdi/js";
import type { ModuleName } from "@timmo001/effect-system-bridge";
import { html, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators.js";

import { AtomController } from "~/controllers/atom-controller";
import { registry } from "~/lib/atoms";
import { exportHistory, historyModules } from "~/lib/history";
import { moduleInfo } from "~/lib/navigation";

import "./sb-menu-button";
import type { MenuItem } from "./sb-menu-button";

const formats: readonly MenuItem[] = [
  {
    value: "csv",
    label: "CSV",
    description: "A row per reading, for spreadsheets",
    icon: mdiFileDelimitedOutline,
  },
  {
    value: "json",
    label: "JSON",
    description: "As the API returns it",
    icon: mdiCodeJson,
  },
];

const isHistoryModule = (value: string): value is ModuleName =>
  [...historyModules].some((module) => module === value);

/**
 * An Export menu that downloads up to the last 24 hours of readings. Given a
 * `module`, it exports that module's; otherwise the menu lists every module
 * as a checkbox, all checked to start, above the formats.
 */
@customElement("sb-history-export")
export class SbHistoryExport extends LitElement {
  /** Exports only this module's readings, when set. */
  @property() module: ModuleName | undefined = undefined;

  /** The modules ticked in the menu, when there's no `module`. */
  @state() private chosen: ReadonlySet<ModuleName> = new Set(historyModules);

  readonly #export = new AtomController(this, () => exportHistory);

  #onToggle = (event: CustomEvent<{ value: string; checked: boolean }>) => {
    const { value, checked } = event.detail;

    if (!isHistoryModule(value)) return;

    const chosen = new Set(this.chosen);

    if (checked) chosen.add(value);
    else chosen.delete(value);

    this.chosen = chosen;
  };

  #onSelect = (event: CustomEvent<{ readonly value: string }>) => {
    const format = event.detail.value;

    if (format !== "csv" && format !== "json") return;

    registry.set(exportHistory, {
      format,
      modules:
        this.module === undefined
          ? [...historyModules].filter((module) => this.chosen.has(module))
          : [this.module],
    });
  };

  #items(): readonly MenuItem[] {
    if (this.module !== undefined) return formats;

    const none = this.chosen.size === 0;

    return [
      ...[...historyModules].map((module): MenuItem => ({
        value: module,
        label: moduleInfo[module].label,
        kind: "checkbox",
        checked: this.chosen.has(module),
        group: "Modules",
      })),
      ...formats.map((format): MenuItem => ({
        ...format,
        group: "Download as",
        disabled: none,
        description: none ? "Choose a module first" : format.description,
      })),
    ];
  }

  override render() {
    return html`<sb-menu-button
      narrow-icon
      label="Export"
      menu-label=${
        this.module === undefined
          ? "Export history"
          : `Export ${moduleInfo[this.module].label} history`
      }
      .icon=${mdiDownload}
      .items=${this.#items()}
      ?busy=${this.#export.value.waiting}
      @menu-toggle=${this.#onToggle}
      @menu-select=${this.#onSelect}
    ></sb-menu-button>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "sb-history-export": SbHistoryExport;
  }
}
