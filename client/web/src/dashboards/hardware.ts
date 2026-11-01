import { mdiBattery, mdiBatteryCharging, mdiFan, mdiPowerPlug } from "@mdi/js";
import type {
  AudioDevice,
  BatteryState,
  CPUTimes,
  Display,
  SensorsWindowsHardware,
  SensorsWindowsSensor,
} from "@timmo001/effect-system-bridge";
import { Option, Schema } from "effect";
import { html, nothing, svg, type TemplateResult } from "lit";

import { icon } from "~/components/shared-styles";
import {
  caption,
  formatBytes,
  formatCount,
  formatFrequency,
  formatNumber,
  formatPercent,
  formatTemperature,
  formatUptime,
  formatRpm,
  formatWatts,
} from "~/lib/format";
import { gpuHistory } from "~/lib/history";

import {
  type DashboardContext,
  facts,
  graphCard,
  hasReadings,
  noData,
  stat,
  yesNo,
} from "./shared";

const percent = (value: number) => formatPercent(value);

const timeLabels: Readonly<Record<keyof CPUTimes, string>> = {
  user: "User",
  system: "System",
  idle: "Idle",
  interrupt: "Interrupt",
  dpc: "DPC",
};

const timeKeys: readonly (keyof CPUTimes)[] = [
  "user",
  "system",
  "idle",
  "interrupt",
  "dpc",
];

export const cpuDashboard = ({ data, history }: DashboardContext) => {
  const cpu = data.cpu;

  if (cpu === undefined) return noData("CPU data");

  const times = cpu.times_percent;
  const frequency = cpu.frequency;

  const cores = cpu.per_cpu.map(
    (core) =>
      html`<gw-meter
        label="Core ${core.id}"
        .value=${core.usage}
        .high=${75}
        .critical=${90}
        caption=${caption(formatFrequency(core.frequency?.current))}
      ></gw-meter>`,
  );

  const timeMeters =
    times === null
      ? []
      : timeKeys.flatMap((key) =>
          times[key] === null
            ? []
            : [
                html`<gw-meter
                  label=${timeLabels[key]}
                  .value=${times[key]}
                ></gw-meter>`,
              ],
        );

  return html`
    <div class="dashboard">
      <sb-card class="third" heading="Usage" subheading=${cpu.name ?? ""}>
        <div class="gauges">
          <gw-gauge
            label="CPU"
            .value=${cpu.usage}
            caption=${caption(formatFrequency(frequency?.current))}
          ></gw-gauge>
        </div>
        <div class="stats">
          ${stat("Cores", String(cpu.count ?? cpu.per_cpu.length))}
          ${stat("Temperature", formatTemperature(cpu.temperature))}
          ${stat(
            "Load average",
            [cpu.load_average, cpu.load_average_5, cpu.load_average_15]
              .flatMap((load) => (load === null ? [] : [formatNumber(load)]))
              .join(" · "),
          )}
          ${stat("Power", formatWatts(cpu.power))}
        </div>
      </sb-card>
      <sb-card class="two-thirds" heading="Usage over time">
        <sb-timeseries
          label="CPU usage over time"
          .series=${[{ label: "CPU", samples: history.cpu }]}
          .max=${100}
          .format=${percent}
          .height=${240}
        ></sb-timeseries>
      </sb-card>
      ${
        hasReadings(cpu.temperature, history.cpuTemperature)
          ? graphCard({
              heading: "Temperature",
              label: "CPU temperature over time",
              series: [{ label: "CPU", samples: history.cpuTemperature }],
              format: formatTemperature,
            })
          : nothing
      }
      ${
        hasReadings(cpu.power, history.cpuPower)
          ? graphCard({
              heading: "Power",
              label: "CPU power over time",
              series: [{ label: "CPU", samples: history.cpuPower }],
              format: formatWatts,
            })
          : nothing
      }
      ${
        hasReadings(frequency?.current, history.cpuFrequency)
          ? graphCard({
              heading: "Frequency",
              label: "CPU frequency over time",
              series: [{ label: "CPU", samples: history.cpuFrequency }],
              format: formatFrequency,
            })
          : nothing
      }
      ${
        hasReadings(cpu.load_average, history.loadAverage)
          ? graphCard({
              heading: "Load average",
              label: "Load average over time",
              series: [{ label: "Load", samples: history.loadAverage }],
              format: formatNumber,
            })
          : nothing
      }
      <sb-card heading="Cores" subheading="Usage of each logical core">
        <div class="meters compact">${cores}</div>
      </sb-card>
      ${
        timeMeters.length === 0
          ? nothing
          : html`<sb-card class="half" heading="Time spent">
              <div class="meters">${timeMeters}</div>
            </sb-card>`
      }
      <sb-card class="half" heading="Details">
        ${facts([
          ["Model", cpu.name],
          ["Vendor", cpu.vendor],
          ["Family", cpu.family],
          ["Frequency", formatFrequency(frequency?.current)],
          [
            "Range",
            frequency?.min == null || frequency.max === null
              ? null
              : `${formatFrequency(frequency.min)} to ${formatFrequency(frequency.max)}`,
          ],
          [
            "Voltage",
            cpu.voltage === null ? null : `${formatNumber(cpu.voltage)} V`,
          ],
          ["Context switches", formatCount(cpu.stats?.ctx_switches)],
          ["Interrupts", formatCount(cpu.stats?.interrupts)],
          ["Soft interrupts", formatCount(cpu.stats?.soft_interrupts)],
          ["System calls", formatCount(cpu.stats?.syscalls)],
        ])}
      </sb-card>
    </div>
  `;
};

export const memoryDashboard = ({ data, history }: DashboardContext) => {
  const memory = data.memory;

  if (memory === undefined) return noData("memory data");

  const { virtual, swap } = memory;
  const total = virtual?.total ?? null;
  const hasSwap = Boolean(swap?.total);

  const parts: readonly (readonly [string, number | null | undefined])[] = [
    ["Used", virtual?.used],
    ["Available", virtual?.available],
    ["Cached", virtual?.cached],
    ["Buffers", virtual?.buffers],
    ["Shared", virtual?.shared],
    ["Active", virtual?.active],
    ["Inactive", virtual?.inactive],
    ["Wired", virtual?.wired],
  ];

  const partMeters = parts.flatMap(([label, value]) =>
    value === null || value === undefined || total === null
      ? []
      : [
          html`<gw-meter
            label=${label}
            .value=${value}
            .max=${total}
            display=${formatBytes(value)}
          ></gw-meter>`,
        ],
  );

  return html`
    <div class="dashboard">
      <sb-card class="third" heading="In use">
        <div class="gauges">
          <gw-gauge
            label="Memory"
            .value=${virtual?.percent ?? undefined}
            caption=${caption(`${formatBytes(virtual?.used)} of ${formatBytes(total)}`)}
          ></gw-gauge>
          ${
            hasSwap
              ? html`<gw-gauge
                  label="Swap"
                  .value=${swap?.percent ?? undefined}
                  caption="${formatBytes(swap?.used)} of ${formatBytes(swap?.total)}"
                ></gw-gauge>`
              : nothing
          }
        </div>
      </sb-card>
      <sb-card class="two-thirds" heading="Usage over time">
        <sb-timeseries
          label="Memory and swap usage over time"
          .series=${[
            { label: "Memory", samples: history.memory },
            ...(hasSwap ? [{ label: "Swap", samples: history.swap }] : []),
          ]}
          .max=${100}
          .format=${percent}
          .height=${240}
        ></sb-timeseries>
      </sb-card>
      <sb-card class="half" heading="Physical memory">
        <div class="meters">${partMeters}</div>
      </sb-card>
      <sb-card class="half" heading="Details">
        ${facts([
          ["Total", formatBytes(total)],
          ["Free", formatBytes(virtual?.free)],
          ["Swap total", hasSwap ? formatBytes(swap?.total) : null],
          ["Swap free", hasSwap ? formatBytes(swap?.free) : null],
          ["Swapped in", swap?.sin ? formatBytes(swap.sin) : null],
          ["Swapped out", swap?.sout ? formatBytes(swap.sout) : null],
        ])}
      </sb-card>
    </div>
  `;
};

/** GPU memory is reported in MiB. */
const mebibytes = (value: number | null) =>
  formatBytes(value === null ? null : value * 1024 ** 2);

export const gpusDashboard = ({ data, history }: DashboardContext) => {
  const gpus = data.gpus;

  if (gpus === undefined || gpus.length === 0) return noData("GPUs");

  const cards = gpus.map((gpu) => {
    const memoryPercent =
      gpu.memory_used !== null && gpu.memory_total
        ? (gpu.memory_used / gpu.memory_total) * 100
        : gpu.memory_load;

    const recorded = gpuHistory(history, gpu.id);

    return html`
      <sb-card class="half" heading=${gpu.name} subheading="GPU ${gpu.id}">
        <div class="gauges">
          <gw-gauge
            label="Core"
            .value=${gpu.core_load}
            caption=${caption(formatFrequency(gpu.core_clock))}
          ></gw-gauge>
          <gw-gauge
            label="Memory"
            .value=${memoryPercent}
            caption="${mebibytes(gpu.memory_used)} of ${mebibytes(gpu.memory_total)}"
          ></gw-gauge>
        </div>
        <sb-timeseries
          label="${gpu.name} core and memory load over time"
          .series=${[
            { label: "Core", samples: recorded.coreLoad },
            { label: "Memory", samples: recorded.memoryLoad },
          ]}
          .max=${100}
          .format=${percent}
          .height=${150}
        ></sb-timeseries>
        <div class="stats">
          ${stat("Temperature", formatTemperature(gpu.temperature))}
          ${stat("Power", formatWatts(gpu.power_usage))}
          ${stat("Power limit", formatWatts(gpu.power_limit))}
          ${stat(
            "Fan",
            [
              gpu.fan_speed === null ? "" : formatRpm(gpu.fan_speed),
              gpu.fan_speed_percent === null
                ? ""
                : formatPercent(gpu.fan_speed_percent),
            ]
              .filter((value) => value !== "")
              .join(" · "),
          )}
          ${stat("Memory clock", formatFrequency(gpu.memory_clock))}
          ${stat("Encoder", formatPercent(gpu.encoder_load))}
          ${stat("Decoder", formatPercent(gpu.decoder_load))}
          ${stat("Performance state", gpu.performance_state ?? "")}
        </div>
      </sb-card>
    `;
  });

  const temperatures = gpus.filter((gpu) =>
    hasReadings(gpu.temperature, gpuHistory(history, gpu.id).temperature),
  );

  const powered = gpus.filter((gpu) =>
    hasReadings(gpu.power_usage, gpuHistory(history, gpu.id).power),
  );

  return html`<div class="dashboard">
    ${cards}
    ${
      temperatures.length === 0
        ? nothing
        : graphCard({
            heading: "Temperature",
            label: "GPU temperatures over time",
            series: temperatures.map((gpu) => ({
              label: gpu.name,
              samples: gpuHistory(history, gpu.id).temperature,
            })),
            format: formatTemperature,
          })
    }
    ${
      powered.length === 0
        ? nothing
        : graphCard({
            heading: "Power",
            label: "GPU power over time",
            series: powered.map((gpu) => ({
              label: gpu.name,
              samples: gpuHistory(history, gpu.id).power,
            })),
            format: formatWatts,
          })
    }
  </div>`;
};

/** A Windows sensor's reading, which LibreHardwareMonitor gives untyped. */
const SensorValue = Schema.Union([Schema.Finite, Schema.String]);

const decodeSensorValue = Schema.decodeUnknownOption(SensorValue);

const sensorReading = (sensor: SensorsWindowsSensor): string =>
  Option.match(decodeSensorValue(sensor.value), {
    onNone: () => "-",
    onSome: (reading) =>
      Schema.is(Schema.Finite)(reading) ? formatNumber(reading) : reading,
  });

const windowsHardware = (hardware: SensorsWindowsHardware): TemplateResult => {
  const children = hardware.subhardware.map(windowsHardware);

  return html`<sb-card heading=${hardware.name} subheading=${hardware.type}>
    ${facts(
      hardware.sensors.map(
        (sensor) =>
          [`${sensor.name} (${sensor.type})`, sensorReading(sensor)] as const,
      ),
    )}
    ${children}
  </sb-card>`;
};

export const sensorsDashboard = ({ data, history }: DashboardContext) => {
  const sensors = data.sensors;

  if (sensors === undefined) return noData("sensor data");

  // Sensors and fans that went away still show in the graphs by their key
  const fanNames = new Map(
    sensors.fans.map((fan) => [fan.key, fan.name || fan.label || fan.key]),
  );

  // Side by side when there are both, otherwise across the page
  const width =
    history.temperatures.size > 0 && history.fans.size > 0 ? "half" : "full";

  const temperatureGraph =
    history.temperatures.size === 0
      ? nothing
      : graphCard({
          heading: "Temperatures over time",
          label: "Sensor temperatures over time",
          series: [...history.temperatures].map(([key, samples]) => ({
            label: key,
            samples,
          })),
          format: formatTemperature,
          height: 220,
          width,
        });

  const fanGraph =
    history.fans.size === 0
      ? nothing
      : graphCard({
          heading: "Fan speeds over time",
          label: "Fan speeds over time",
          series: [...history.fans].map(([key, samples]) => ({
            label: fanNames.get(key) ?? key,
            samples,
          })),
          format: formatRpm,
          height: 220,
          width,
        });

  const hardware = (sensors.windows_sensors?.hardware ?? []).map(
    windowsHardware,
  );

  const temperatures = sensors.temperatures.map((sensor) => {
    const limit = sensor.critical > 0 ? sensor.critical : 100;

    return html`<gw-meter
      label=${sensor.key}
      .value=${sensor.temperature}
      .max=${limit}
      display=${formatTemperature(sensor.temperature)}
      caption=${sensor.high > 0 ? `High ${formatTemperature(sensor.high)}` : ""}
      .high=${sensor.high > 0 ? sensor.high : limit * 0.8}
      .critical=${limit * 0.95}
    ></gw-meter>`;
  });

  const fans = sensors.fans.map(
    (fan) =>
      html`<li>
        ${icon(mdiFan)}
        <span class="spacer">${fan.label || fan.name}</span>
        <span class="tabular">${formatRpm(fan.speed_rpm)}</span>
      </li>`,
  );

  return html`
    <div class="dashboard">
      ${temperatureGraph} ${fanGraph}
      <sb-card heading="Temperatures">
        ${
          temperatures.length === 0
            ? html`<p class="muted small">No temperature sensors reported.</p>`
            : html`<div class="meters">${temperatures}</div>`
        }
      </sb-card>
      <sb-card heading="Fans">
        ${
          fans.length === 0
            ? html`<p class="muted small">No fans reported.</p>`
            : html`<ul class="list">
                ${fans}
              </ul>`
        }
      </sb-card>
      ${hardware}
    </div>
  `;
};

const batteryStateLabels: Readonly<Record<BatteryState, string>> = {
  charging: "Charging",
  discharging: "Discharging",
  full: "Full",
  not_charging: "Not charging",
  empty: "Empty",
  unknown: "Unknown",
};

export const batteryDashboard = ({ data, history }: DashboardContext) => {
  const battery = data.battery;

  if (battery === undefined) return noData("battery");

  // The top-level fields describe the first system battery, when it has a charge
  const primary =
    battery.percentage == null
      ? null
      : (battery.batteries.find((item) => item.scope === "system") ?? null);

  const others = battery.batteries.filter((item) => item !== primary);

  if (battery.percentage == null && others.length === 0)
    return noData("battery");

  const remaining = battery.time_remaining;
  const state = battery.state ?? (battery.is_charging ? "charging" : "unknown");
  const charging = state === "charging";

  const otherMeters = others.map(
    (item) =>
      html`<gw-meter
        label=${item.model ?? item.name}
        .value=${item.percentage}
        display=${formatPercent(item.percentage)}
        caption=${batteryStateLabels[item.state]}
        .high=${20}
        .critical=${10}
        inverted
      ></gw-meter>`,
  );

  const otherCard = html`<sb-card
    heading=${primary ? "Other batteries" : "Batteries"}
  >
    <div class="meters">${otherMeters}</div>
  </sb-card>`;

  if (battery.percentage == null) {
    return html`<div class="dashboard">${otherCard}</div>`;
  }

  return html`
    <div class="dashboard">
      <sb-card class="third" heading="Charge">
        <div class="gauges">
          <gw-gauge
            label="Battery"
            .value=${battery.percentage}
            .warning=${20}
            .danger=${10}
            inverted
            caption=${batteryStateLabels[state]}
          ></gw-gauge>
        </div>
        <div class="row" style="justify-content: center">
          <span class="chip ${charging ? "success" : ""}">
            ${icon(
              charging
                ? mdiBatteryCharging
                : battery.ac_connected
                  ? mdiPowerPlug
                  : mdiBattery,
            )}
            ${
              battery.ac_connected === null
                ? batteryStateLabels[state]
                : battery.ac_connected
                  ? "Plugged in"
                  : "On battery"
            }
          </span>
        </div>
        ${facts([
          ["State", batteryStateLabels[state]],
          [
            charging ? "Time to full" : "Time to empty",
            remaining === null || remaining < 0
              ? null
              : formatUptime(remaining),
          ],
          ["Power", battery.power === null ? null : formatWatts(battery.power)],
          [
            "Voltage",
            battery.voltage === null
              ? null
              : `${formatNumber(battery.voltage)} V`,
          ],
        ])}
      </sb-card>
      <sb-card class="two-thirds" heading="Charge over time">
        <sb-timeseries
          label="Battery charge over time"
          .series=${[{ label: "Battery", samples: history.battery }]}
          .max=${100}
          .format=${percent}
          .height=${240}
        ></sb-timeseries>
      </sb-card>
      ${others.length > 0 ? otherCard : nothing}
    </div>
  `;
};

/** The displays drawn where they sit relative to each other. */
const displayLayout = (
  displays: readonly (Display & { readonly x: number; readonly y: number })[],
) => {
  const left = Math.min(...displays.map((d) => d.x));
  const top = Math.min(...displays.map((d) => d.y));
  const right = Math.max(...displays.map((d) => d.x + d.resolution_horizontal));
  const bottom = Math.max(...displays.map((d) => d.y + d.resolution_vertical));
  const width = Math.max(1, right - left);
  const height = Math.max(1, bottom - top);
  const gap = Math.max(width, height) * 0.01;

  const screens = displays.map((display, index) => {
    const colour = `var(--sb-color-chart-${(index % 6) + 1})`;

    return svg`
      <g>
        <rect
          x=${display.x + gap / 2}
          y=${display.y + gap / 2}
          width=${display.resolution_horizontal - gap}
          height=${display.resolution_vertical - gap}
          rx=${gap * 2}
          style="fill: color-mix(in oklab, ${colour} 18%, var(--sb-color-surface)); stroke: ${colour}"
          stroke-width=${gap / 2}
        ></rect>
        <text
          x=${display.x + display.resolution_horizontal / 2}
          y=${display.y + display.resolution_vertical / 2}
          text-anchor="middle"
          dominant-baseline="middle"
          font-size=${Math.min(display.resolution_horizontal, display.resolution_vertical) / 9}
          style="fill: var(--sb-color-text)"
        >${display.name}</text>
      </g>
    `;
  });

  return html`<svg
    viewBox="${left - gap} ${top - gap} ${width + gap * 2} ${height + gap * 2}"
    role="img"
    aria-label="Display arrangement"
    style="width: 100%; max-height: 18rem"
  >
    ${screens}
  </svg>`;
};

export const displaysDashboard = ({ data }: DashboardContext) => {
  const displays = data.displays;

  if (displays === undefined || displays.length === 0) {
    return noData("displays");
  }

  const cards = displays.map(
    (display) => html`
      <sb-card
        class="half"
        heading=${display.name}
        subheading=${display.is_primary ? "Primary" : display.name === display.id ? "" : display.id}
      >
        ${
          display.brightness === null && display.power_state === null
            ? nothing
            : html`<sb-display-controls
                .display=${display}
              ></sb-display-controls>`
        }
        ${facts([
          [
            "Resolution",
            `${display.resolution_horizontal} × ${display.resolution_vertical}`,
          ],
          [
            "Position",
            display.x === null || display.y === null
              ? null
              : `${display.x}, ${display.y}`,
          ],
          [
            "Size",
            display.width === null || display.height === null
              ? null
              : `${display.width} × ${display.height} mm`,
          ],
          [
            "Refresh rate",
            display.refresh_rate === null
              ? null
              : `${formatNumber(display.refresh_rate)} Hz`,
          ],
          [
            "Pixel clock",
            display.pixel_clock === null
              ? null
              : `${formatNumber(display.pixel_clock)} MHz`,
          ],
          ["Primary", yesNo(display.is_primary)],
        ])}
      </sb-card>
    `,
  );

  // Without a compositor's layout, such as under Wayland, there's nothing to
  // arrange
  const placed = displays.flatMap((display) =>
    display.x === null || display.y === null
      ? []
      : [{ ...display, x: display.x, y: display.y }],
  );

  return html`
    <div class="dashboard">
      ${
        placed.length === displays.length
          ? html`<sb-card heading="Arrangement"
              >${displayLayout(placed)}</sb-card
            >`
          : nothing
      }
      ${cards}
    </div>
  `;
};

export const camerasDashboard = ({ data }: DashboardContext) => {
  const cameras = data.cameras?.cameras;

  if (cameras === undefined || cameras.length === 0) {
    return noData("cameras");
  }

  const cards = cameras.map((camera) => {
    // In the order the camera lists them
    const groups = [
      ...new Set(camera.controls.map((control) => control.group)),
    ];

    const sets = groups.map(
      (group) => html`
        <sb-card
          class="half"
          heading=${group || "Controls"}
          subheading=${camera.name}
        >
          <sb-camera-controls
            .camera=${camera}
            group=${group}
          ></sb-camera-controls>
        </sb-card>
      `,
    );

    const format = camera.format;

    const supported = camera.formats
      .map(
        (option) =>
          `${option.name || option.format} up to ${option.width} × ${option.height}`,
      )
      .join(", ");

    return html`
      <sb-card heading=${camera.name} subheading=${camera.device}>
        ${facts([
          ["Driver", camera.driver],
          [
            "Resolution",
            format === null ? null : `${format.width} × ${format.height}`,
          ],
          ["Format", format === null ? null : format.name || format.format],
          ["Supported formats", supported || null],
        ])}
        <sb-camera-capture slot="footer" .camera=${camera}></sb-camera-capture>
      </sb-card>
      ${sets}
    `;
  });

  return html`<div class="dashboard">${cards}</div>`;
};

/** The default device's main card, with the others as smaller cards under it. */
const audioColumn = (
  kind: "output" | "input",
  heading: string,
  devices: readonly AudioDevice[],
) => {
  if (devices.length === 0) return nothing;

  const fallback = devices.find((device) => device.default) ?? devices[0];

  const others = [...devices]
    .filter((device) => device !== fallback)
    .sort((a, b) => a.name.localeCompare(b.name))
    .map(
      (device) =>
        html`<sb-card subheading=${heading}>
          <sb-audio-device .device=${device}></sb-audio-device>
        </sb-card>`,
    );

  return html`<div class="audio-column">
    <sb-audio-main kind=${kind} .devices=${devices}></sb-audio-main>
    ${others.length === 0 ? nothing : html`<div class="audio-others">${others}</div>`}
  </div>`;
};

export const audioDashboard = ({ data }: DashboardContext) => {
  const audio = data.audio;

  if (
    audio === undefined ||
    (audio.outputs.length === 0 && audio.inputs.length === 0)
  ) {
    return noData("audio devices");
  }

  const outputNames = new Map(
    audio.outputs.map((output) => [output.id, output.name]),
  );

  const apps = [...audio.apps]
    .sort((a, b) => a.name.localeCompare(b.name))
    .map(
      (app) =>
        html`<sb-audio-device
          .app=${app}
          .outputName=${
            app.output === null
              ? null
              : (outputNames.get(app.output) ?? app.output)
          }
        ></sb-audio-device>`,
    );

  return html`
    <div class="dashboard">
      <div class="audio-columns">
        ${audioColumn("output", "Output", audio.outputs)}
        ${audioColumn("input", "Input", audio.inputs)}
      </div>
      ${
        apps.length === 0
          ? nothing
          : html`<sb-card heading="Apps">
              <div class="audio-devices">${apps}</div>
            </sb-card>`
      }
    </div>
  `;
};
