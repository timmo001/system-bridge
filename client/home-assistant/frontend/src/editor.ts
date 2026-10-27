import { html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { DEFAULT_HOURS_TO_SHOW } from "./cards";
import { PAGES } from "./pages";
import { SECTIONS } from "./sections";
import type {
  DashboardStrategyConfig,
  HomeAssistant,
  SectionStrategyConfig,
  ViewStrategyConfig,
} from "./types";

type StrategyConfig =
  DashboardStrategyConfig | ViewStrategyConfig | SectionStrategyConfig;

const LABELS = new Map([
  ["device_id", "System Bridge device"],
  ["hours_to_show", "Hours of history"],
  ["page", "Page"],
  ["section", "Section"],
  ["item", "Disk, mount, GPU, display or network interface"],
]);

/** The schema for whichever strategy the config belongs to. */
const schemaFor = (config: StrategyConfig) => [
  {
    name: "device_id",
    selector: { device: { integration: "system_bridge" } },
  },
  ...("page" in config
    ? [
        {
          name: "page",
          required: true,
          selector: {
            select: {
              mode: "dropdown",
              options: PAGES.map(({ page, title }) => ({
                value: page,
                label: title,
              })),
            },
          },
        },
      ]
    : []),
  ...("section" in config
    ? [
        {
          name: "section",
          required: true,
          selector: {
            select: {
              mode: "dropdown",
              options: Object.keys(SECTIONS).map((value) => ({
                value,
                label: value,
              })),
            },
          },
        },
        { name: "item", selector: { text: {} } },
      ]
    : []),
  {
    name: "hours_to_show",
    selector: {
      number: { min: 1, max: 168, mode: "box", unit_of_measurement: "h" },
    },
  },
];

@customElement("system-bridge-strategy-editor")
export class SystemBridgeStrategyEditor extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: StrategyConfig;

  public setConfig(config: StrategyConfig) {
    this._config = config;
  }

  protected render() {
    if (!this._config) {
      return nothing;
    }

    return html`
      <ha-form
        .hass=${this.hass}
        .data=${{ hours_to_show: DEFAULT_HOURS_TO_SHOW, ...this._config }}
        .schema=${schemaFor(this._config)}
        .computeLabel=${this._computeLabel}
        @value-changed=${this._valueChanged}
      ></ha-form>
    `;
  }

  private _computeLabel = (schema: { name: string }) =>
    LABELS.get(schema.name) ?? schema.name;

  private _valueChanged = (ev: CustomEvent<{ value: StrategyConfig }>) => {
    ev.stopPropagation();

    const { hours_to_show, ...config } = {
      ...this._config,
      ...ev.detail.value,
    };

    this.dispatchEvent(
      new CustomEvent("config-changed", {
        detail: {
          config:
            hours_to_show === undefined ||
            hours_to_show === DEFAULT_HOURS_TO_SHOW
              ? config
              : { ...config, hours_to_show },
        },
        bubbles: true,
        composed: true,
      }),
    );
  };
}

declare global {
  interface HTMLElementTagNameMap {
    "system-bridge-strategy-editor": SystemBridgeStrategyEditor;
  }
}
