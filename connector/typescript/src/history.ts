import type {
  HistorySample,
  MetricHistory,
  SeriesHistory,
} from "./generated/modules.js";

/** One reading in an exported history. */
export interface HistoryRow {
  /** When it was taken, in Unix milliseconds. */
  readonly time: number;
  readonly metric: string;
  /** Which GPU, disk, sensor or fan, and empty for the rest. */
  readonly id: string;
  readonly value: number;
  readonly unit: string;
}

/** The first row of an exported CSV history. */
export const historyCsvHeader = [
  "time",
  "metric",
  "id",
  "value",
  "unit",
] as const;

/**
 * Flattens a history into one row per reading, a metric at a time, each
 * oldest first. The metrics, IDs and units match the CLI's and the Python
 * connector's exports.
 */
export const historyRows = (history: MetricHistory): HistoryRow[] => {
  const rows: HistoryRow[] = [];

  const add = (
    metric: string,
    id: string,
    unit: string,
    samples: readonly HistorySample[],
  ) => {
    for (const sample of samples) {
      rows.push({ time: sample.time, metric, id, value: sample.value, unit });
    }
  };

  const addEach = (
    metric: string,
    unit: string,
    list: readonly SeriesHistory[],
  ) => {
    for (const series of list) add(metric, series.id, unit, series.samples);
  };

  add("cpu", "", "%", history.cpu);
  add("cpu_temperature", "", "°C", history.cpu_temperature);
  add("cpu_frequency", "", "MHz", history.cpu_frequency);
  add("cpu_power", "", "W", history.cpu_power);
  add("load_average", "", "", history.load_average);
  add("memory", "", "%", history.memory);
  add("swap", "", "%", history.swap);
  add("battery", "", "%", history.battery);
  add("system_power", "", "W", history.system_power);
  add("network_receive", "", "B/s", history.network_receive);
  add("network_send", "", "B/s", history.network_send);
  add("disk_read", "", "B/s", history.disk_read);
  add("disk_write", "", "B/s", history.disk_write);
  addEach("disk_temperature", "°C", history.disk_temperatures);

  for (const gpu of history.gpus) {
    add("gpu_core_load", gpu.id, "%", gpu.core_load);
    add("gpu_memory_load", gpu.id, "%", gpu.memory_load);
    add("gpu_temperature", gpu.id, "°C", gpu.temperature);
    add("gpu_power", gpu.id, "W", gpu.power);
  }

  addEach("temperature", "°C", history.temperatures);
  addEach("fan", "RPM", history.fans);

  return rows;
};

/** Quotes a CSV field when it holds a comma, quote or line break. */
const csvField = (value: string) =>
  /[",\r\n]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value;

/** A history as CSV, one row per reading, with times in UTC. */
export const historyToCsv = (history: MetricHistory): string =>
  [
    historyCsvHeader.join(","),
    ...historyRows(history).map((row) =>
      [
        new Date(row.time).toISOString(),
        row.metric,
        row.id,
        String(row.value),
        row.unit,
      ]
        .map(csvField)
        .join(","),
    ),
    "",
  ].join("\n");
