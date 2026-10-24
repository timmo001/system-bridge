import { mdiBatteryCharging, mdiFan, mdiPowerPlug } from "@mdi/js";
import type {
  CPUTimes,
  Display,
  SensorsWindowsHardware,
  SensorsWindowsSensor,
} from "@timmo001/effect-system-bridge";
import { Option, Schema } from "effect";
import { html, nothing, svg, type TemplateResult } from "lit";

import { icon } from "~/components/shared-styles";
import {
  formatBytes,
  formatCount,
  formatFrequency,
  formatNumber,
  formatPercent,
  formatTemperature,
  formatUptime,
  formatWatts,
} from "~/lib/format";

import { type DashboardContext, facts, noData, stat, yesNo } from "./shared";

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

/** Readings that never count as a problem, such as time spent idle. */
const neutral = Number.POSITIVE_INFINITY;

export const cpuDashboard = ({ data, history }: DashboardContext) => {
  const cpu = data.cpu;

  if (cpu === undefined) return noData("CPU data");

  const times = cpu.times_percent;
  const frequency = cpu.frequency;

  const cores = cpu.per_cpu.map(
    (core) =>
      html`<sb-meter
        label="Core ${core.id}"
        .value=${core.usage}
        caption=${formatFrequency(core.frequency?.current)}
      ></sb-meter>`,
  );

  const timeMeters =
    times === null
      ? []
      : timeKeys.flatMap((key) =>
          times[key] === null
            ? []
            : [
                html`<sb-meter
                  label=${timeLabels[key]}
                  .value=${times[key]}
                  .warning=${neutral}
                  .danger=${neutral}
                ></sb-meter>`,
              ],
        );

  return html`
    <div class="dashboard">
      <sb-card class="third" heading="Usage" subheading=${cpu.name ?? ""}>
        <div class="gauges">
          <sb-gauge
            label="CPU"
            .value=${cpu.usage}
            caption=${formatFrequency(frequency?.current)}
          ></sb-gauge>
        </div>
        <div class="stats">
          ${stat("Cores", String(cpu.count ?? cpu.per_cpu.length))}
          ${stat("Temperature", formatTemperature(cpu.temperature))}
          ${stat("Load average", formatNumber(cpu.load_average))}
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
          html`<sb-meter
            label=${label}
            .value=${value}
            .max=${total}
            display=${formatBytes(value)}
            .warning=${neutral}
            .danger=${neutral}
          ></sb-meter>`,
        ],
  );

  return html`
    <div class="dashboard">
      <sb-card class="third" heading="In use">
        <div class="gauges">
          <sb-gauge
            label="Memory"
            .value=${virtual?.percent ?? null}
            caption="${formatBytes(virtual?.used)} of ${formatBytes(total)}"
          ></sb-gauge>
          ${
            hasSwap
              ? html`<sb-gauge
                  label="Swap"
                  .value=${swap?.percent ?? null}
                  caption="${formatBytes(swap?.used)} of ${formatBytes(swap?.total)}"
                ></sb-gauge>`
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

    return html`
      <sb-card class="half" heading=${gpu.name} subheading="GPU ${gpu.id}">
        <div class="gauges">
          <sb-gauge
            label="Core"
            .value=${gpu.core_load}
            caption=${formatFrequency(gpu.core_clock)}
          ></sb-gauge>
          <sb-gauge
            label="Memory"
            .value=${memoryPercent}
            caption="${mebibytes(gpu.memory_used)} of ${mebibytes(gpu.memory_total)}"
          ></sb-gauge>
        </div>
        <sb-timeseries
          label="${gpu.name} core load over time"
          .series=${[{ label: "Core", samples: history.gpus.get(gpu.id) ?? [] }]}
          .max=${100}
          .format=${percent}
          .height=${150}
        ></sb-timeseries>
        <div class="stats">
          ${stat("Temperature", formatTemperature(gpu.temperature))}
          ${stat("Power", formatWatts(gpu.power_usage))}
          ${stat(
            "Fan",
            gpu.fan_speed === null ? "-" : `${formatNumber(gpu.fan_speed)} RPM`,
          )}
          ${stat("Memory clock", formatFrequency(gpu.memory_clock))}
        </div>
      </sb-card>
    `;
  });

  return html`<div class="dashboard">${cards}</div>`;
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

export const sensorsDashboard = ({ data }: DashboardContext) => {
  const sensors = data.sensors;

  if (sensors === undefined) return noData("sensor data");

  const hardware = (sensors.windows_sensors?.hardware ?? []).map(
    windowsHardware,
  );

  const temperatures = sensors.temperatures.map((sensor) => {
    const limit = sensor.critical > 0 ? sensor.critical : 100;

    return html`<sb-meter
      label=${sensor.key}
      .value=${sensor.temperature}
      .max=${limit}
      display=${formatTemperature(sensor.temperature)}
      caption=${sensor.high > 0 ? `High ${formatTemperature(sensor.high)}` : ""}
      .warning=${sensor.high > 0 ? (sensor.high / limit) * 100 : 80}
      .danger=${95}
    ></sb-meter>`;
  });

  const fans = sensors.fans.map(
    (fan) =>
      html`<li>
        ${icon(mdiFan)}
        <span class="spacer">${fan.label || fan.name}</span>
        <span class="tabular"
          >${fan.speed_rpm === null ? "-" : `${formatNumber(fan.speed_rpm)} RPM`}</span
        >
      </li>`,
  );

  return html`
    <div class="dashboard">
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

export const batteryDashboard = ({ data, history }: DashboardContext) => {
  const battery = data.battery;

  if (battery?.percentage == null) return noData("battery");

  const remaining = battery.time_remaining;

  return html`
    <div class="dashboard">
      <sb-card class="third" heading="Charge">
        <div class="gauges">
          <sb-gauge
            label="Battery"
            .value=${battery.percentage}
            .warning=${20}
            .danger=${10}
            inverted
            caption=${battery.is_charging ? "Charging" : "On battery"}
          ></sb-gauge>
        </div>
        <div class="row" style="justify-content: center">
          <span class="chip ${battery.is_charging ? "success" : ""}">
            ${icon(battery.is_charging ? mdiBatteryCharging : mdiPowerPlug)}
            ${battery.is_charging ? "Charging" : "Discharging"}
          </span>
        </div>
        ${facts([
          [
            "Time remaining",
            remaining === null || remaining < 0
              ? null
              : formatUptime(remaining),
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
    </div>
  `;
};

/** The displays drawn where they sit relative to each other. */
const displayLayout = (displays: readonly Display[]) => {
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
        subheading=${display.is_primary ? "Primary" : ""}
      >
        ${facts([
          [
            "Resolution",
            `${display.resolution_horizontal} × ${display.resolution_vertical}`,
          ],
          ["Position", `${display.x}, ${display.y}`],
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

  return html`
    <div class="dashboard">
      <sb-card heading="Arrangement">${displayLayout(displays)}</sb-card>
      ${cards}
    </div>
  `;
};
