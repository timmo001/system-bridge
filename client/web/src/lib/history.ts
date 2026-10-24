import type { ModulesData } from "@timmo001/effect-system-bridge";
import { Option } from "effect";
import { Atom } from "effect/reactivity";

import { latestModuleData } from "./atoms";

/** How many samples each series keeps. */
export const historyLength = 90;

export interface Sample {
  /** When the sample arrived, in milliseconds. */
  readonly time: number;
  readonly value: number;
}

export type Series = readonly Sample[];

/** A counter's last reading, to turn the next into a rate. */
interface Counter {
  readonly time: number;
  readonly value: number;
}

export interface MetricHistory {
  readonly cpu: Series;
  readonly memory: Series;
  readonly swap: Series;
  readonly battery: Series;
  readonly networkReceive: Series;
  readonly networkSend: Series;
  readonly diskRead: Series;
  readonly diskWrite: Series;
  /** Each GPU's core load, by GPU ID. */
  readonly gpus: ReadonlyMap<string, Series>;
  /** The module data each series last read, so unchanged modules add nothing. */
  readonly seen: ModulesData;
  readonly counters: ReadonlyMap<string, Counter>;
}

const empty: MetricHistory = {
  cpu: [],
  memory: [],
  swap: [],
  battery: [],
  networkReceive: [],
  networkSend: [],
  diskRead: [],
  diskWrite: [],
  gpus: new Map(),
  seen: {},
  counters: new Map(),
};

const push = (series: Series, time: number, value: number | null): Series =>
  value === null || !Number.isFinite(value)
    ? series
    : [...series.slice(-(historyLength - 1)), { time, value }];

/** The rate a counter rose at since its last reading, in units per second. */
const rate = (
  counters: Map<string, Counter>,
  key: string,
  time: number,
  value: number | null | undefined,
): number | null => {
  if (value === null || value === undefined) return null;

  const previous = counters.get(key);

  counters.set(key, { time, value });

  if (previous === undefined || time <= previous.time) return null;

  // A counter that went down was reset, such as after a resume
  if (value < previous.value) return null;

  return ((value - previous.value) * 1000) / (time - previous.time);
};

const record = (
  history: MetricHistory,
  data: ModulesData,
  time: number,
): MetricHistory => {
  const { seen } = history;
  const counters = new Map(history.counters);
  let next = { ...history, seen: data };

  if (data.cpu !== undefined && data.cpu !== seen.cpu) {
    next = { ...next, cpu: push(next.cpu, time, data.cpu.usage) };
  }

  if (data.memory !== undefined && data.memory !== seen.memory) {
    next = {
      ...next,
      memory: push(next.memory, time, data.memory.virtual?.percent ?? null),
      swap: push(next.swap, time, data.memory.swap?.percent ?? null),
    };
  }

  if (data.battery !== undefined && data.battery !== seen.battery) {
    next = {
      ...next,
      battery: push(next.battery, time, data.battery.percentage),
    };
  }

  if (data.networks !== undefined && data.networks !== seen.networks) {
    const io = data.networks.io;

    next = {
      ...next,
      networkReceive: push(
        next.networkReceive,
        time,
        rate(counters, "network-receive", time, io?.bytes_recv),
      ),
      networkSend: push(
        next.networkSend,
        time,
        rate(counters, "network-send", time, io?.bytes_sent),
      ),
    };
  }

  if (data.disks !== undefined && data.disks !== seen.disks) {
    const io = data.disks.io_counters;

    next = {
      ...next,
      diskRead: push(
        next.diskRead,
        time,
        rate(counters, "disk-read", time, io?.read_bytes),
      ),
      diskWrite: push(
        next.diskWrite,
        time,
        rate(counters, "disk-write", time, io?.write_bytes),
      ),
    };
  }

  if (data.gpus !== undefined && data.gpus !== seen.gpus) {
    const gpus = new Map(next.gpus);

    for (const gpu of data.gpus) {
      gpus.set(gpu.id, push(gpus.get(gpu.id) ?? [], time, gpu.core_load));
    }

    next = { ...next, gpus };
  }

  return { ...next, counters };
};

/**
 * Recent readings of the main metrics, for graphs. Kept for the whole visit,
 * so moving between pages doesn't lose them.
 */
export const metricHistory = Atom.make((get): MetricHistory => {
  const data = get(latestModuleData);
  const previous = Option.getOrElse(get.self<MetricHistory>(), () => empty);

  return record(previous, data, Date.now());
}).pipe(Atom.keepAlive);
