import {
  type HistorySample,
  historyToCsv,
  type MetricHistory as BackendHistory,
  type ModuleName,
  type SeriesHistory,
} from "@timmo001/effect-system-bridge";
import { Effect, Option } from "effect";
import { AsyncResult, Atom } from "effect/reactivity";

import { type BridgeError, fnSocket, latestModuleData, socket } from "./atoms";

/** How far back the backend keeps readings, in milliseconds. */
export const historyWindow = 24 * 60 * 60 * 1000;

export type Sample = HistorySample;

export type Series = readonly Sample[];

/** A GPU's loads in percent, temperature in °C and power in watts. */
export interface GpuHistory {
  readonly coreLoad: Series;
  readonly memoryLoad: Series;
  readonly temperature: Series;
  readonly power: Series;
}

/**
 * Usage is in percent, temperatures in °C, frequency in MHz, power in watts,
 * fan speeds in RPM, and network and disk values in bytes per second.
 */
export interface MetricHistory {
  readonly cpu: Series;
  readonly cpuTemperature: Series;
  readonly cpuFrequency: Series;
  readonly cpuPower: Series;
  readonly loadAverage: Series;
  readonly memory: Series;
  readonly swap: Series;
  readonly battery: Series;
  readonly systemPower: Series;
  readonly networkReceive: Series;
  readonly networkSend: Series;
  readonly diskRead: Series;
  readonly diskWrite: Series;
  /** By disk name. */
  readonly diskTemperatures: ReadonlyMap<string, Series>;
  /** By GPU ID. */
  readonly gpus: ReadonlyMap<string, GpuHistory>;
  /** By sensor key. */
  readonly temperatures: ReadonlyMap<string, Series>;
  /** By fan key. */
  readonly fans: ReadonlyMap<string, Series>;
}

const noGpu: GpuHistory = {
  coreLoad: [],
  memoryLoad: [],
  temperature: [],
  power: [],
};

const empty: MetricHistory = {
  cpu: [],
  cpuTemperature: [],
  cpuFrequency: [],
  cpuPower: [],
  loadAverage: [],
  memory: [],
  swap: [],
  battery: [],
  systemPower: [],
  networkReceive: [],
  networkSend: [],
  diskRead: [],
  diskWrite: [],
  diskTemperatures: new Map(),
  gpus: new Map(),
  temperatures: new Map(),
  fans: new Map(),
};

const byId = (list: readonly SeriesHistory[]) =>
  new Map(list.map((series) => [series.id, series.samples]));

const fromBackend = (history: BackendHistory): MetricHistory => ({
  cpu: history.cpu,
  cpuTemperature: history.cpu_temperature,
  cpuFrequency: history.cpu_frequency,
  cpuPower: history.cpu_power,
  loadAverage: history.load_average,
  memory: history.memory,
  swap: history.swap,
  battery: history.battery,
  systemPower: history.system_power,
  networkReceive: history.network_receive,
  networkSend: history.network_send,
  diskRead: history.disk_read,
  diskWrite: history.disk_write,
  diskTemperatures: byId(history.disk_temperatures),
  gpus: new Map(
    history.gpus.map((gpu) => [
      gpu.id,
      {
        coreLoad: gpu.core_load,
        memoryLoad: gpu.memory_load,
        temperature: gpu.temperature,
        power: gpu.power,
      },
    ]),
  ),
  temperatures: byId(history.temperatures),
  fans: byId(history.fans),
});

/** Every series held, for finding the newest reading. */
const allSeries = (history: MetricHistory): readonly Series[] => [
  history.cpu,
  history.cpuTemperature,
  history.cpuFrequency,
  history.cpuPower,
  history.loadAverage,
  history.memory,
  history.swap,
  history.battery,
  history.systemPower,
  history.networkReceive,
  history.networkSend,
  history.diskRead,
  history.diskWrite,
  ...history.diskTemperatures.values(),
  ...[...history.gpus.values()].flatMap((gpu) => [
    gpu.coreLoad,
    gpu.memoryLoad,
    gpu.temperature,
    gpu.power,
  ]),
  ...history.temperatures.values(),
  ...history.fans.values(),
];

/** The time of the newest reading held, if there is one. */
const newest = (history: MetricHistory): number | undefined => {
  const times = allSeries(history).flatMap(
    (series) => series.at(-1)?.time ?? [],
  );

  return times.length === 0 ? undefined : Math.max(...times);
};

/** Joins two maps of history by key, dropping keys left with nothing. */
const joinMaps = <A>(
  held: ReadonlyMap<string, A>,
  next: ReadonlyMap<string, A>,
  join: (held: A | undefined, next: A | undefined) => A,
  isEmpty: (value: A) => boolean,
): ReadonlyMap<string, A> => {
  const joined = new Map<string, A>();

  for (const key of new Set([...held.keys(), ...next.keys()])) {
    const value = join(held.get(key), next.get(key));

    if (!isEmpty(value)) joined.set(key, value);
  }

  return joined;
};

/** Adds the newer readings to each series and drops those past the window. */
const merge = (
  held: MetricHistory,
  next: MetricHistory,
  now: number,
): MetricHistory => {
  const cutoff = now - historyWindow;

  const join = (a: Series = [], b: Series = []): Series =>
    [...a, ...b].filter((sample) => sample.time > cutoff);

  const joinSeries = (
    a: ReadonlyMap<string, Series>,
    b: ReadonlyMap<string, Series>,
  ) => joinMaps(a, b, join, (series) => series.length === 0);

  return {
    cpu: join(held.cpu, next.cpu),
    cpuTemperature: join(held.cpuTemperature, next.cpuTemperature),
    cpuFrequency: join(held.cpuFrequency, next.cpuFrequency),
    cpuPower: join(held.cpuPower, next.cpuPower),
    loadAverage: join(held.loadAverage, next.loadAverage),
    memory: join(held.memory, next.memory),
    swap: join(held.swap, next.swap),
    battery: join(held.battery, next.battery),
    systemPower: join(held.systemPower, next.systemPower),
    networkReceive: join(held.networkReceive, next.networkReceive),
    networkSend: join(held.networkSend, next.networkSend),
    diskRead: join(held.diskRead, next.diskRead),
    diskWrite: join(held.diskWrite, next.diskWrite),
    diskTemperatures: joinSeries(held.diskTemperatures, next.diskTemperatures),
    gpus: joinMaps(
      held.gpus,
      next.gpus,
      (a = noGpu, b = noGpu) => ({
        coreLoad: join(a.coreLoad, b.coreLoad),
        memoryLoad: join(a.memoryLoad, b.memoryLoad),
        temperature: join(a.temperature, b.temperature),
        power: join(a.power, b.power),
      }),
      (gpu) =>
        gpu.coreLoad.length +
          gpu.memoryLoad.length +
          gpu.temperature.length +
          gpu.power.length ===
        0,
    ),
    temperatures: joinSeries(held.temperatures, next.temperatures),
    fans: joinSeries(held.fans, next.fans),
  };
};

/** The data of the modules that have graphs, so others don't refetch. */
const graphedData = Atom.make((get) => {
  const { cpu, memory, battery, system, networks, disks, gpus, sensors } =
    get(latestModuleData);

  return [
    cpu,
    memory,
    battery,
    system,
    networks,
    disks,
    gpus,
    sensors,
  ] as const;
});

/**
 * The backend's readings, fetched in full once and then only the newer ones
 * as graphed modules update. Modules arrive in a burst each minute, and each
 * one restarts the wait before a refetch, so the burst sends one request.
 */
const historyData = Atom.make((get) => {
  get(graphedData);

  const held = get
    .self<AsyncResult.AsyncResult<MetricHistory, BridgeError>>()
    .pipe(Option.flatMap(AsyncResult.value));

  const since = held.pipe(Option.flatMapNullishOr(newest));

  return socket(get).pipe(
    // The first fetch waits only for the modules answering as the page
    // opens, so graphs fill straight away
    Effect.delay(Option.isSome(held) ? "1 second" : "200 millis"),
    Effect.flatMap((bridge) =>
      bridge.getHistory(
        Option.match(since, {
          onNone: () => ({}),
          onSome: (time) => ({ since: time }),
        }),
      ),
    ),
    Effect.map((next) =>
      Option.match(held, {
        onNone: () => fromBackend(next),
        onSome: (history) => merge(history, fromBackend(next), Date.now()),
      }),
    ),
  );
}).pipe(Atom.keepAlive);

/**
 * Recent readings of the main metrics, for graphs. Keeps the last readings
 * through refetches and reconnects.
 */
export const metricHistory = Atom.make((get): MetricHistory =>
  AsyncResult.getOrElse(get(historyData), () => empty),
);

export type ExportFormat = "csv" | "json";

/** The modules whose readings the backend keeps, which can be exported. */
export const historyModules: ReadonlySet<ModuleName> = new Set([
  "battery",
  "cpu",
  "disks",
  "gpus",
  "memory",
  "networks",
  "sensors",
  "system",
]);

export interface HistoryExport {
  readonly format: ExportFormat;
  /** Exports only these modules' readings, when set. */
  readonly modules?: readonly ModuleName[];
}

/** Saves a file through the browser's download. */
const download = (name: string, type: string, contents: string) => {
  const url = URL.createObjectURL(new Blob([contents], { type }));
  const link = document.createElement("a");

  link.href = url;
  link.download = name;
  link.click();
  URL.revokeObjectURL(url);
};

/**
 * Downloads the backend's history, or some modules', as CSV with a row per
 * reading or as JSON in the shape `GET_HISTORY` returns, named for the host,
 * modules and time.
 */
export const exportHistory = Atom.fn(
  ({ format, modules }: HistoryExport, get) => {
    // Every module needs no filter, and no module in the name
    const some =
      modules !== undefined && modules.length < historyModules.size
        ? modules
        : undefined;

    return fnSocket(get).pipe(
      Effect.flatMap((bridge) =>
        bridge.getHistory(some === undefined ? {} : { modules: some }),
      ),
      Effect.tap((history) =>
        Effect.sync(() => {
          const host = get(latestModuleData).system?.hostname ?? "system";
          const stamp = new Date().toISOString().slice(0, 16).replace(":", "-");

          const name = [
            "system-bridge-history",
            host,
            ...(some ?? []),
            `${stamp}.${format}`,
          ].join("-");

          if (format === "csv") {
            download(name, "text/csv", historyToCsv(history));
          } else {
            download(
              name,
              "application/json",
              `${JSON.stringify(history, null, 2)}\n`,
            );
          }
        }),
      ),
    );
  },
);

/** A GPU's history, or empty series when there's none yet. */
export const gpuHistory = (history: MetricHistory, id: string): GpuHistory =>
  history.gpus.get(id) ?? noGpu;
