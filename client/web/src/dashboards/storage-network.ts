import { mdiArrowDown, mdiArrowUp } from "@mdi/js";
import type { NetworkConnection } from "@timmo001/effect-system-bridge";
import { html, nothing } from "lit";

import { dataTableColumns } from "~/components/sb-data-table";
import { icon } from "~/components/shared-styles";
import {
  formatBytes,
  formatCount,
  formatNumber,
  formatQuantity,
  formatRate,
  formatTemperature,
} from "~/lib/format";

import {
  type DashboardContext,
  facts,
  graphCard,
  noData,
  onTableChange,
  stat,
  tableState,
} from "./shared";

const lastValue = (samples: readonly { readonly value: number }[]) =>
  samples.at(-1)?.value ?? null;

export const disksDashboard = ({ data, history }: DashboardContext) => {
  const disks = data.disks;

  if (disks === undefined) return noData("disks");

  const io = disks.io_counters;

  const cards = disks.devices.map((disk) => {
    const partitions = disk.partitions.map(
      (partition) =>
        html`<sb-meter
          label=${partition.mount_point}
          .value=${partition.usage?.percent ?? null}
          display=${
            partition.usage === null
              ? "-"
              : `${formatBytes(partition.usage.used)} of ${formatBytes(partition.usage.total)}`
          }
          caption="${partition.device} · ${partition.filesystem_type}"
          .warning=${80}
          .danger=${92}
        ></sb-meter>`,
    );

    const count = formatQuantity(disk.partitions.length, "partition");

    return html`
      <sb-card
        class="half"
        heading=${disk.name}
        subheading=${
          disk.temperature === null
            ? count
            : `${count} · ${formatTemperature(disk.temperature)}`
        }
      >
        ${
          partitions.length === 0
            ? html`<p class="muted small">No mounted partitions.</p>`
            : html`<div class="stack">${partitions}</div>`
        }
        ${
          disk.io_counters === null
            ? nothing
            : facts([
                [
                  "Reading",
                  disk.io_counters.read_bytes_rate === null
                    ? null
                    : formatRate(disk.io_counters.read_bytes_rate),
                ],
                [
                  "Writing",
                  disk.io_counters.write_bytes_rate === null
                    ? null
                    : formatRate(disk.io_counters.write_bytes_rate),
                ],
                ["Read", formatBytes(disk.io_counters.read_bytes)],
                ["Written", formatBytes(disk.io_counters.write_bytes)],
              ])
        }
      </sb-card>
    `;
  });

  return html`
    <div class="dashboard">
      <sb-card class="two-thirds" heading="Activity" subheading="All disks">
        <sb-timeseries
          label="Disk read and write rates over time"
          .series=${[
            { label: "Read", samples: history.diskRead },
            { label: "Write", samples: history.diskWrite },
          ]}
          .format=${formatRate}
          .height=${220}
        ></sb-timeseries>
      </sb-card>
      <sb-card class="third" heading="Totals">
        <div class="stats">
          ${stat("Reading", formatRate(io?.read_bytes_rate))}
          ${stat("Writing", formatRate(io?.write_bytes_rate))}
          ${stat("Read", formatBytes(io?.read_bytes))}
          ${stat("Written", formatBytes(io?.write_bytes))}
          ${stat("Reads", formatCount(io?.read_count))}
          ${stat("Writes", formatCount(io?.write_count))}
        </div>
      </sb-card>
      ${
        history.diskTemperatures.size === 0
          ? nothing
          : graphCard({
              heading: "Temperature",
              label: "Disk temperatures over time",
              series: [...history.diskTemperatures].map(([name, samples]) => ({
                label: name,
                samples,
              })),
              format: formatTemperature,
              width: "full",
            })
      }
      ${cards}
    </div>
  `;
};

const connectionColumns = (() => {
  const column = dataTableColumns<NetworkConnection>();

  return column.columns([
    column.accessor((row) => row.laddr ?? "", {
      id: "local",
      header: "Local address",
    }),
    column.accessor((row) => row.raddr ?? "", {
      id: "remote",
      header: "Remote address",
    }),
    column.accessor((row) => row.status ?? "", {
      id: "status",
      header: "Status",
    }),
    column.accessor((row) => row.pid ?? -1, {
      id: "pid",
      header: "PID",
      cell: ({ getValue }) => (getValue() < 0 ? "-" : String(getValue())),
    }),
  ]);
})();

/** Connections have no ID, so this combines what tells them apart. */
const connectionId = (row: NetworkConnection, index: number) =>
  `${row.fd ?? ""}-${row.laddr ?? ""}-${row.raddr ?? ""}-${index}`;

export const networksDashboard = ({
  data,
  history,
  location,
}: DashboardContext) => {
  const networks = data.networks;

  if (networks === undefined) return noData("networks");

  const io = networks.io;

  // A rate with its direction's arrow, once there are two readings to give one
  const rate = (
    path: string,
    samples: readonly { readonly value: number }[],
  ) =>
    samples.length === 0
      ? ""
      : html`${icon(path)} ${formatRate(lastValue(samples))}`;

  const interfaces = networks.networks.map((network) => {
    const addresses = network.addresses.map(
      (address) => [address.family ?? "Address", address.address] as const,
    );

    return html`
      <sb-card class="third" heading=${network.name ?? "Interface"}>
        <span
          slot="actions"
          class="chip ${network.stats?.isup ? "success" : ""}"
          ><span class="dot"></span>${network.stats?.isup ? "Up" : "Down"}</span
        >
        ${facts([
          [
            "Receiving",
            network.io?.bytes_recv_rate == null
              ? null
              : formatRate(network.io.bytes_recv_rate),
          ],
          [
            "Sending",
            network.io?.bytes_sent_rate == null
              ? null
              : formatRate(network.io.bytes_sent_rate),
          ],
          ["Received", network.io ? formatBytes(network.io.bytes_recv) : null],
          ["Sent", network.io ? formatBytes(network.io.bytes_sent) : null],
          [
            "Speed",
            network.stats?.speed
              ? `${formatNumber(network.stats.speed)} Mb/s`
              : null,
          ],
          ["MTU", network.stats?.mtu],
          ["Duplex", network.stats?.duplex],
          ...addresses,
        ])}
      </sb-card>
    `;
  });

  return html`
    <div class="dashboard">
      <sb-card class="two-thirds" heading="Traffic" subheading="All interfaces">
        <sb-timeseries
          label="Network receive and send rates over time"
          .series=${[
            { label: "Received", samples: history.networkReceive },
            { label: "Sent", samples: history.networkSend },
          ]}
          .format=${formatRate}
          .height=${220}
        ></sb-timeseries>
      </sb-card>
      <sb-card class="third" heading="Totals">
        <div class="stats">
          ${stat("Receiving", rate(mdiArrowDown, history.networkReceive))}
          ${stat("Sending", rate(mdiArrowUp, history.networkSend))}
          ${stat("Received", formatBytes(io?.bytes_recv))}
          ${stat("Sent", formatBytes(io?.bytes_sent))}
          ${stat("Packets in", formatCount(io?.packets_recv))}
          ${stat("Packets out", formatCount(io?.packets_sent))}
          ${stat("Errors", formatCount((io?.errin ?? 0) + (io?.errout ?? 0)))}
          ${stat("Dropped", formatCount((io?.dropin ?? 0) + (io?.dropout ?? 0)))}
        </div>
      </sb-card>
      ${interfaces}
      <sb-card
        heading="Connections"
        subheading="${networks.connections.length} open"
      >
        <sb-data-table
          label="Network connections"
          search-placeholder="Search connections"
          .columns=${connectionColumns}
          .data=${networks.connections}
          .rowId=${connectionId}
          .numeric=${["pid"]}
          .state=${tableState(location.search, {
            sort: "status",
            descending: false,
          })}
          @table-state-change=${onTableChange(location)}
        ></sb-data-table>
      </sb-card>
    </div>
  `;
};
