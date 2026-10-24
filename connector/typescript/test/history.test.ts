import { describe, expect, test } from "bun:test";
import { historyToCsv, type MetricHistory } from "../src/index.js";

const empty = {
  cpu: [],
  cpu_temperature: [],
  cpu_frequency: [],
  cpu_power: [],
  load_average: [],
  memory: [],
  swap: [],
  battery: [],
  system_power: [],
  network_receive: [],
  network_send: [],
  disk_read: [],
  disk_write: [],
  disk_temperatures: [],
  gpus: [],
  temperatures: [],
  fans: [],
} satisfies MetricHistory;

describe("historyToCsv", () => {
  // The same rows the CLI's export test expects, so the two stay alike
  test("matches the CLI's CSV", () => {
    const csv = historyToCsv({
      ...empty,
      cpu: [{ time: 1700000000000, value: 12.5 }],
      load_average: [{ time: 1700000000000, value: 1.25 }],
      network_send: [{ time: 1700000060000, value: 2048 }],
      gpus: [
        {
          id: "gpu0",
          core_load: [],
          memory_load: [],
          temperature: [{ time: 1700000000000, value: 48 }],
          power: [],
        },
      ],
      fans: [{ id: "fan1", samples: [{ time: 1700000000000, value: 1200 }] }],
    });

    expect(csv).toBe(
      [
        "time,metric,id,value,unit",
        "2023-11-14T22:13:20.000Z,cpu,,12.5,%",
        "2023-11-14T22:13:20.000Z,load_average,,1.25,",
        "2023-11-14T22:14:20.000Z,network_send,,2048,B/s",
        "2023-11-14T22:13:20.000Z,gpu_temperature,gpu0,48,°C",
        "2023-11-14T22:13:20.000Z,fan,fan1,1200,RPM",
        "",
      ].join("\n"),
    );
  });

  test("quotes IDs with commas", () => {
    const csv = historyToCsv({
      ...empty,
      fans: [{ id: 'fan "1", left', samples: [{ time: 0, value: 1 }] }],
    });

    expect(csv).toContain('fan,"fan ""1"", left",1,RPM');
  });
});
