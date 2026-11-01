import { mdiCodeJson, mdiDownload, mdiFileDelimitedOutline } from "@mdi/js";
import type { ModuleName } from "@timmo001/effect-system-bridge";
import { html, LitElement, type PropertyValues } from "lit";
import { customElement, property, state } from "lit/decorators.js";

import { AtomController } from "~/controllers/atom-controller";
import { registry } from "~/lib/atoms";
import { exportHistory, historyModules } from "~/lib/history";
import { moduleInfo } from "~/lib/navigation";

import "@timmo001/groundwork-ui/gw-menu-button.ts";
import type { MenuItem } from "@timmo001/groundwork-ui/gw-menu-button.ts";
import { menuCheck, menuValue } from "~/lib/select";

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
 * An Export menu that downloads up to the last 24 hours of readings. It
 * lists every module with history as a checkbox, above the formats, ticked
 * to start for `modules`, the ones the page shows.
 */
@customElement("sb-history-export")
export class SbHistoryExport extends LitElement {
  /** The modules ticked to start. Every module, when not set. */
  @property({ attribute: false }) modules: readonly ModuleName[] | undefined =
    undefined;

  /** The modules ticked in the menu. */
  @state() private chosen: ReadonlySet<ModuleName> = new Set(historyModules);

  readonly #export = new AtomController(this, () => exportHistory);

  // A new page's modules replace the ticks left from the last page
  protected override willUpdate(changed: PropertyValues<this>): void {
    if (changed.has("modules")) {
      this.chosen = new Set(this.modules ?? historyModules);
    }
  }

  #onToggle = (event: Event) => {
    const { value, checked } = menuCheck(event);

    if (!isHistoryModule(value)) return;

    const chosen = new Set(this.chosen);

    if (checked) chosen.add(value);
    else chosen.delete(value);

    this.chosen = chosen;
  };

  #onSelect = (event: Event) => {
    const format = menuValue(event);

    if (format !== "csv" && format !== "json") return;

    registry.set(exportHistory, {
      format,
      modules: [...historyModules].filter((module) => this.chosen.has(module)),
    });
  };

  #items(): readonly MenuItem[] {
    const none = this.chosen.size === 0;

    return [
      ...[...historyModules].map((module): MenuItem => ({
        value: module,
        label: moduleInfo[module].label,
        checkbox: true,
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
    return html`<gw-menu-button
      labels="auto"
      size="small"
      label="Export"
      .icon=${mdiDownload}
      .items=${this.#items()}
      ?loading=${this.#export.value.waiting}
      @check=${this.#onToggle}
      @select=${this.#onSelect}
    ></gw-menu-button>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "sb-history-export": SbHistoryExport;
  }
}
