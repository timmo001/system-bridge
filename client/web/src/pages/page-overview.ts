import { mdiAlertCircleOutline, mdiMusicNote } from "@mdi/js";
import type { ModuleName, ModulesData } from "@timmo001/effect-system-bridge";
import { css, html, nothing } from "lit";
import { customElement } from "lit/decorators.js";

import "~/components/sb-card";
import "~/components/sb-gauge";
import "~/components/sb-history-export";
import "~/components/sb-meter";
import "~/components/sb-timeseries";
import { icon, pageStyles, shared } from "~/components/shared-styles";
import { AtomController } from "~/controllers/atom-controller";
import {
  dashboardStyles,
  powerSeries,
  temperatureSeries,
} from "~/dashboards/shared";
import { actionResult, moduleState } from "~/lib/atoms";
import {
  formatBytes,
  formatFrequency,
  formatPercent,
  formatPlayerStatus,
  formatQuantity,
  formatRate,
  formatTemperature,
  formatUptime,
  formatWatts,
} from "~/lib/format";
import { exportHistory, metricHistory } from "~/lib/history";
import { moduleInfo, moduleOrder } from "~/lib/navigation";
import { href } from "~/lib/router";

import { SbPage } from "./sb-page";

const percent = (value: number) => formatPercent(value);

/** A short reading for each module's shortcut. */
const summary = (module: ModuleName, data: ModulesData): string => {
  switch (module) {
    case "system":
      return data.system ? `Up ${formatUptime(data.system.uptime)}` : "";
    case "cpu":
      return data.cpu ? formatPercent(data.cpu.usage) : "";
    case "memory":
      return data.memory?.virtual
        ? formatPercent(data.memory.virtual.percent)
        : "";
    case "disks":
      return data.disks
        ? formatQuantity(data.disks.devices.length, "disk")
        : "";
    case "networks":
      return data.networks
        ? formatQuantity(data.networks.networks.length, "interface")
        : "";
    case "gpus":
      return data.gpus ? formatQuantity(data.gpus.length, "GPU") : "";
    case "sensors":
      return data.sensors
        ? formatQuantity(data.sensors.temperatures.length, "temperature")
        : "";
    case "battery":
      return data.battery?.percentage === null || data.battery === undefined
        ? ""
        : formatPercent(data.battery.percentage);
    case "displays":
      return data.displays
        ? formatQuantity(data.displays.length, "display")
        : "";
    case "desktop":
      return data.desktop
        ? formatQuantity(data.desktop.windows.length, "window")
        : "";
    case "bluetooth":
      return data.bluetooth
        ? `${data.bluetooth.devices.filter((device) => device.connected).length} connected`
        : "";
    case "audio": {
      const output = data.audio?.outputs.find((device) => device.default);

      if (output === undefined) return "";

      if (output.muted) return "Muted";

      return output.volume === null
        ? output.name
        : formatPercent(output.volume);
    }

    case "processes":
      return data.processes ? `${data.processes.length} running` : "";
    case "media":
      return data.media?.title ?? (data.media ? "Nothing playing" : "");
    case "discord":
      return data.discord
        ? data.discord.connected
          ? "Connected"
          : "Not connected"
        : "";
  }
};

const placeholder = html`
  <div class="dashboard" aria-busy="true" aria-label="Loading">
    <span
      class="skeleton placeholder"
      style="--sb-placeholder-height: 13rem"
    ></span>
    <span class="skeleton placeholder half"></span>
    <span class="skeleton placeholder half"></span>
    <span class="skeleton placeholder half"></span>
    <span class="skeleton placeholder half"></span>
  </div>
`;

/** The main readings from every module at a glance. */
@customElement("page-overview")
export class PageOverview extends SbPage {
  static override styles = [
    shared,
    pageStyles,
    dashboardStyles,
    css`
      .shortcuts {
        display: grid;
        gap: var(--sb-space-3);
        grid-template-columns: repeat(auto-fill, minmax(min(100%, 9rem), 1fr));
      }

      .shortcut {
        flex-direction: row;
        align-items: center;
        gap: var(--sb-space-3);
        padding: var(--sb-space-3);
      }

      .shortcut > .icon {
        flex-shrink: 0;
        color: var(--sb-color-accent);
      }

      .shortcut .text {
        display: flex;
        flex-direction: column;
        min-width: 0;
      }

      .gauges sb-gauge {
        --sb-gauge-size: 8rem;
      }
    `,
  ];

  readonly #modules = new AtomController(this, () => moduleState);

  readonly #history = new AtomController(this, () => metricHistory);

  readonly #export = new AtomController(this, () => exportHistory);

  protected readonly pageTitle = "Overview";

  #renderGauges(data: ModulesData) {
    const { cpu, memory, battery, gpus } = data;
    const gpu = gpus?.[0];

    return html`
      <sb-card
        heading=${data.system?.hostname ?? "This system"}
        subheading=${
          data.system
            ? `${data.system.platform} ${data.system.platform_version} · up ${formatUptime(data.system.uptime)}`
            : ""
        }
        href=${href("module", { params: { module: "system" } })}
      >
        <div class="gauges">
          <sb-gauge
            label="CPU"
            .value=${cpu?.usage ?? null}
            caption=${cpu ? formatFrequency(cpu.frequency?.current) : ""}
          ></sb-gauge>
          <sb-gauge
            label="Memory"
            .value=${memory?.virtual?.percent ?? null}
            caption=${
              memory?.virtual
                ? `${formatBytes(memory.virtual.used)} of ${formatBytes(memory.virtual.total)}`
                : ""
            }
          ></sb-gauge>
          ${
            gpu === undefined
              ? nothing
              : html`<sb-gauge
                  label="GPU"
                  .value=${gpu.core_load}
                  caption=${gpu.name}
                ></sb-gauge>`
          }
          ${
            cpu?.temperature === null || cpu?.temperature === undefined
              ? nothing
              : html`<sb-gauge
                  label="CPU temperature"
                  .value=${cpu.temperature}
                  display=${Math.round(cpu.temperature)}
                  unit="°C"
                  .warning=${80}
                  .danger=${90}
                ></sb-gauge>`
          }
          ${
            battery?.percentage === null || battery === undefined
              ? nothing
              : html`<sb-gauge
                  label="Battery"
                  .value=${battery.percentage}
                  .warning=${20}
                  .danger=${10}
                  inverted
                  caption=${
                    battery.is_charging
                      ? "Charging"
                      : battery.ac_connected
                        ? "Plugged in"
                        : ""
                  }
                ></sb-gauge>`
          }
        </div>
      </sb-card>
    `;
  }

  #renderStorage(data: ModulesData) {
    const meters = (data.disks?.devices ?? []).flatMap((disk) =>
      disk.partitions.flatMap((partition) =>
        partition.category === "primary"
          ? [
              html`<sb-meter
                label=${partition.mount_point}
                .value=${partition.usage?.percent ?? null}
                display=${
                  partition.usage === null
                    ? "-"
                    : `${formatBytes(partition.usage.free)} free`
                }
                .warning=${80}
                .danger=${92}
              ></sb-meter>`,
            ]
          : [],
      ),
    );

    return html`
      <sb-card
        class="half"
        heading="Storage"
        href=${href("module", { params: { module: "disks" } })}
      >
        ${
          meters.length === 0
            ? html`<p class="muted small">No disks reported.</p>`
            : html`<div class="stack" style="--sb-stack-gap: var(--sb-space-3)">
                ${meters}
              </div>`
        }
      </sb-card>
    `;
  }

  #renderMedia(data: ModulesData) {
    const media = data.media;

    return html`
      <sb-card
        class="half"
        heading="Now playing"
        href=${href("module", { params: { module: "media" } })}
      >
        ${
          media?.title
            ? html`<div class="row" style="--sb-row-gap: var(--sb-space-4)">
                ${
                  media.thumbnail
                    ? html`<img
                        src=${media.thumbnail}
                        alt=""
                        width="64"
                        height="64"
                        style="border-radius: var(--sb-radius-m); object-fit: cover"
                      />`
                    : icon(mdiMusicNote)
                }
                <div class="stack" style="min-width: 0; --sb-stack-gap: 0">
                  <strong class="truncate">${media.title}</strong>
                  <span class="muted small truncate"
                    >${media.artist ?? ""}</span
                  >
                  <span
                    class="chip"
                    style="align-self: flex-start; margin-top: var(--sb-space-1)"
                    >${formatPlayerStatus(media.status)}</span
                  >
                </div>
              </div>`
            : html`<div class="empty" style="padding: var(--sb-space-4)">
                ${icon(mdiMusicNote)}
                <p class="small">Nothing is playing.</p>
              </div>`
        }
      </sb-card>
    `;
  }

  #renderContent() {
    const { data, settled } = this.#modules.value;
    const history = this.#history.value;
    const temperatures = temperatureSeries(data, history);
    const power = powerSeries(data, history);

    // The gauges at the top need these; the other cards fill in as they come
    if (!settled.has("cpu") || !settled.has("memory")) return placeholder;

    const shortcuts = moduleOrder.map(
      (module) =>
        html`<a
          class="card shortcut"
          href=${href("module", { params: { module } })}
        >
          ${icon(moduleInfo[module].icon)}
          <span class="text">
            <strong class="small">${moduleInfo[module].label}</strong>
            <span class="muted xsmall truncate"
              >${summary(module, data) || moduleInfo[module].description}</span
            >
          </span>
        </a>`,
    );

    return html`
      <div class="dashboard">
        ${
          data.system?.version_newer_available
            ? html`<div class="alert warning">
                ${icon(mdiAlertCircleOutline)}
                <div>
                  <strong
                    >System Bridge ${data.system.version_latest} is
                    available</strong
                  >
                  This system has ${data.system.version}.
                </div>
              </div>`
            : nothing
        }
        ${this.#renderGauges(data)}
        <sb-card
          class="half"
          heading="CPU and memory"
          href=${href("module", { params: { module: "cpu" } })}
        >
          <sb-timeseries
            label="CPU and memory usage over time"
            .series=${[
              { label: "CPU", samples: history.cpu },
              { label: "Memory", samples: history.memory },
            ]}
            .max=${100}
            .format=${percent}
          ></sb-timeseries>
        </sb-card>
        <sb-card
          class="half"
          heading="Network"
          subheading=${
            history.networkReceive.length === 0
              ? ""
              : `${formatRate(history.networkReceive.at(-1)?.value)} down · ${formatRate(history.networkSend.at(-1)?.value)} up`
          }
          href=${href("module", { params: { module: "networks" } })}
        >
          <sb-timeseries
            label="Network traffic over time"
            .series=${[
              { label: "Received", samples: history.networkReceive },
              { label: "Sent", samples: history.networkSend },
            ]}
            .format=${formatRate}
          ></sb-timeseries>
        </sb-card>
        ${
          temperatures.length === 0
            ? nothing
            : html`<sb-card
                class="half"
                heading="Temperatures"
                href=${href("module", { params: { module: "sensors" } })}
              >
                <sb-timeseries
                  label="CPU and GPU temperatures over time"
                  .series=${temperatures}
                  .format=${formatTemperature}
                ></sb-timeseries>
              </sb-card>`
        }
        ${
          power.length === 0
            ? nothing
            : html`<sb-card
                class="half"
                heading="Power"
                href=${href("module", { params: { module: "system" } })}
              >
                <sb-timeseries
                  label="Power use over time"
                  .series=${power}
                  .format=${formatWatts}
                ></sb-timeseries>
              </sb-card>`
        }
        ${this.#renderStorage(data)} ${this.#renderMedia(data)}
        <sb-card
          heading="Modules"
          subheading="All the data System Bridge reports"
        >
          <div class="shortcuts">${shortcuts}</div>
        </sb-card>
      </div>
    `;
  }

  override render() {
    return html`
      <div class="page">
        ${this.renderHeader({
          heading: "Overview",
          description: "Live readings from this system",
          actions: this.status.isConnected
            ? html`<sb-history-export></sb-history-export>`
            : undefined,
        })}
        ${
          // Only a failed export needs a message; the download is the success
          this.#export.value._tag === "Failure"
            ? this.renderResult(actionResult(this.#export.value, ""))
            : nothing
        }
        ${this.gate(() => this.#renderContent(), placeholder)}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "page-overview": PageOverview;
  }
}
