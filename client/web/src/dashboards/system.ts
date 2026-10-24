import {
  mdiAlertCircleOutline,
  mdiMicrophone,
  mdiMusicNote,
  mdiWebcam,
} from "@mdi/js";
import type {
  DiscordCallMember,
  Process,
} from "@timmo001/effect-system-bridge";
import { html, nothing } from "lit";

import { dataTableColumns } from "~/components/sb-data-table";
import { icon } from "~/components/shared-styles";
import {
  formatAgo,
  formatDateTime,
  formatDuration,
  formatNumber,
  formatPercent,
  formatPlayerStatus,
  formatUptime,
} from "~/lib/format";
import { href } from "~/lib/router";

import {
  type DashboardContext,
  facts,
  noData,
  onTableChange,
  stat,
  tableState,
  yesNo,
} from "./shared";

export const systemDashboard = ({ data }: DashboardContext) => {
  const system = data.system;

  if (system === undefined) return noData("system data");

  const device = system.device_info;

  const users = system.users.map(
    (user) =>
      html`<li>
        <span class="spacer">
          <strong>${user.name}</strong>
          <span class="muted xsmall">${user.terminal} ${user.host}</span>
        </span>
        <span class="muted xsmall">${formatAgo(user.started * 1000)}</span>
      </li>`,
  );

  return html`
    <div class="dashboard">
      ${
        system.version_newer_available
          ? html`<div class="alert warning">
              ${icon(mdiAlertCircleOutline)}
              <div>
                <strong>An update is available</strong>
                Version ${system.version_latest} is out; this is
                ${system.version}.
                ${
                  system.version_latest_url === null
                    ? nothing
                    : html`<a
                        href=${system.version_latest_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        >See what's new</a
                      >`
                }
              </div>
            </div>`
          : nothing
      }
      ${
        system.pending_reboot
          ? html`<div class="alert">
              ${icon(mdiAlertCircleOutline)}
              <div>
                <strong>Restart needed</strong>Updates are waiting for a
                restart.
              </div>
            </div>`
          : nothing
      }
      <sb-card
        heading=${system.hostname}
        subheading=${system.fqdn === system.hostname ? "" : system.fqdn}
      >
        <div class="stats">
          ${stat("Uptime", formatUptime(system.uptime))}
          ${stat("Platform", system.platform)}
          ${stat("Power", system.power_usage === null ? "" : `${formatNumber(system.power_usage)} W`)}
          ${stat("Users", String(system.users.length))}
        </div>
      </sb-card>
      <sb-card class="third" heading="Software">
        ${facts([
          ["System Bridge", system.version],
          ["Platform version", system.platform_version],
          ["Kernel", system.kernel_version],
          ["Run mode", system.run_mode],
          ["Booted", formatDateTime(system.boot_time * 1000)],
          ["UUID", html`<span class="mono xsmall">${system.uuid}</span>`],
        ])}
      </sb-card>
      <sb-card class="third" heading="Network">
        ${facts([
          ["IPv4", system.ip_address_4],
          ["IPv6", system.ip_address_6],
          ["MAC address", system.mac_address],
        ])}
      </sb-card>
      <sb-card class="third" heading="Device">
        ${
          device === null
            ? html`<p class="muted small">No device details reported.</p>`
            : facts([
                ["Manufacturer", device.manufacturer],
                ["Model", device.model],
                ["Version", device.version],
                ["Chassis", device.chassis_type],
                [
                  "Board",
                  [device.board_vendor, device.board_name]
                    .filter(Boolean)
                    .join(" "),
                ],
                [
                  "BIOS",
                  [device.bios_vendor, device.bios_version]
                    .filter(Boolean)
                    .join(" "),
                ],
              ])
        }
      </sb-card>
      <sb-card class="half" heading="Users" subheading="Signed in now">
        ${
          users.length === 0
            ? html`<p class="muted small">Nobody is signed in.</p>`
            : html`<ul class="list">
                ${users}
              </ul>`
        }
      </sb-card>
      <sb-card
        class="half"
        heading="Privacy"
        subheading="Apps using the camera or microphone"
      >
        <ul class="list">
          <li>
            ${icon(mdiWebcam)}<span class="spacer">Camera</span>
            <span
              class="chip ${system.camera_usage.length > 0 ? "warning" : ""}"
            >
              ${system.camera_usage.length > 0 ? system.camera_usage.join(", ") : "Not in use"}
            </span>
          </li>
          <li>
            ${icon(mdiMicrophone)}<span class="spacer">Microphone</span>
            <span
              class="chip ${system.microphone_usage.length > 0 ? "warning" : ""}"
            >
              ${system.microphone_usage.length > 0 ? system.microphone_usage.join(", ") : "Not in use"}
            </span>
          </li>
        </ul>
      </sb-card>
    </div>
  `;
};

/**
 * A process's usage as a percentage. CPU usage already is one, but the
 * backend reports memory as a fraction of the total.
 */
const usage = (process: Process, key: "cpu_usage" | "memory_usage") =>
  key === "memory_usage"
    ? (process.memory_usage ?? 0) * 100
    : (process.cpu_usage ?? 0);

const processColumns = (() => {
  const column = dataTableColumns<Process>();

  return column.columns([
    column.accessor((row) => row.name ?? "", {
      id: "name",
      header: "Name",
      cell: ({ getValue, row }) =>
        html`<span title=${row.original.path ?? ""}>${getValue()}</span>`,
    }),
    column.accessor("id", { header: "PID", sortDescFirst: false }),
    column.accessor((row) => row.cpu_usage ?? 0, {
      id: "cpu",
      header: "CPU",
      sortDescFirst: true,
      cell: ({ getValue }) => formatPercent(getValue(), 1),
    }),
    column.accessor((row) => usage(row, "memory_usage"), {
      id: "memory",
      header: "Memory",
      sortDescFirst: true,
      cell: ({ getValue }) => formatPercent(getValue(), 1),
    }),
    column.accessor((row) => row.status ?? "", {
      id: "status",
      header: "Status",
    }),
    column.accessor((row) => row.username ?? "", {
      id: "user",
      header: "User",
    }),
    column.accessor((row) => row.path ?? "", { id: "path", header: "Path" }),
  ]);
})();

const processId = (row: Process) => String(row.id);

const top = (
  processes: readonly Process[],
  key: "cpu_usage" | "memory_usage",
) =>
  [...processes]
    .filter((process) => usage(process, key) > 0)
    .sort((a, b) => usage(b, key) - usage(a, key))
    .slice(0, 6);

export const processesDashboard = ({ data, location }: DashboardContext) => {
  const processes = data.processes;

  if (processes === undefined) return noData("processes");

  const topList = (key: "cpu_usage" | "memory_usage") => {
    const busiest = top(processes, key);
    const max = Math.max(1, ...busiest.map((process) => usage(process, key)));

    const meters = busiest.map(
      (process) =>
        html`<sb-meter
          label="${process.name ?? "Unknown"} (${process.id})"
          .value=${usage(process, key)}
          .max=${max}
          display=${formatPercent(usage(process, key), 1)}
          .warning=${Number.POSITIVE_INFINITY}
          .danger=${Number.POSITIVE_INFINITY}
        ></sb-meter>`,
    );

    return meters.length === 0
      ? html`<p class="muted small">Nothing busy right now.</p>`
      : html`<div class="stack" style="--sb-stack-gap: var(--sb-space-3)">
          ${meters}
        </div>`;
  };

  return html`
    <div class="dashboard">
      <sb-card class="half" heading="Busiest" subheading="By CPU">
        ${topList("cpu_usage")}
      </sb-card>
      <sb-card class="half" heading="Largest" subheading="By memory">
        ${topList("memory_usage")}
      </sb-card>
      <sb-card heading="All processes" subheading="${processes.length} running">
        <sb-data-table
          label="Processes"
          search-placeholder="Search processes"
          .columns=${processColumns}
          .data=${processes}
          .rowId=${processId}
          .numeric=${["id", "cpu", "memory"]}
          .wide=${["path"]}
          .state=${tableState(location.search, {
            sort: "cpu",
            descending: true,
          })}
          @table-state-change=${onTableChange(location)}
        ></sb-data-table>
      </sb-card>
    </div>
  `;
};

export const mediaDashboard = ({ data }: DashboardContext) => {
  const media = data.media;

  if (media === undefined) return noData("media");

  const playing = Boolean(media.title || media.artist);

  const percent =
    media.position !== null && media.duration
      ? (media.position / media.duration) * 100
      : null;

  return html`
    <div class="dashboard">
      <sb-card class="two-thirds" heading="Now playing">
        <a slot="actions" class="button tonal small" href=${href("media")}
          >Controls</a
        >
        ${
          playing
            ? html`<div
                class="row"
                style="--sb-row-gap: var(--sb-space-5); align-items: flex-start"
              >
                ${
                  media.thumbnail
                    ? html`<img
                        src=${media.thumbnail}
                        alt=""
                        width="112"
                        height="112"
                        style="border-radius: var(--sb-radius-l); object-fit: cover"
                      />`
                    : html`<span
                        class="row"
                        style="justify-content: center; width: 7rem; height: 7rem; background: var(--sb-color-sunken); border-radius: var(--sb-radius-l); --sb-icon-size: 2.5rem; color: var(--sb-color-muted)"
                        >${icon(mdiMusicNote)}</span
                      >`
                }
                <div
                  class="stack"
                  style="flex: 1; min-width: 0; --sb-stack-gap: var(--sb-space-1)"
                >
                  <h2 class="truncate">${media.title ?? "Unknown title"}</h2>
                  <span class="muted truncate">${media.artist ?? ""}</span>
                  <span class="muted small truncate"
                    >${media.album_title ?? ""}</span
                  >
                  ${
                    percent === null
                      ? nothing
                      : html`<sb-meter
                          .value=${percent}
                          display="${formatDuration(media.position ?? 0)} / ${formatDuration(media.duration ?? 0)}"
                          .warning=${101}
                          .danger=${101}
                        ></sb-meter>`
                  }
                </div>
              </div>`
            : html`<div class="empty">
                ${icon(mdiMusicNote)}
                <p>Nothing is playing.</p>
              </div>`
        }
      </sb-card>
      <sb-card class="third" heading="Details">
        ${facts([
          ["Status", formatPlayerStatus(media.status)],
          ["Type", media.type],
          [
            "Volume",
            media.volume === null ? null : formatPercent(media.volume * 100),
          ],
          ["Shuffle", yesNo(media.shuffle)],
          ["Repeat", media.repeat],
          ["Track", media.track_number],
          [
            "Playback rate",
            media.playback_rate === null
              ? null
              : `${formatNumber(media.playback_rate)}×`,
          ],
          [
            "Updated",
            media.updated_at === null
              ? null
              : formatAgo(media.updated_at * 1000),
          ],
        ])}
      </sb-card>
    </div>
  `;
};

const member = (call: DiscordCallMember) =>
  html`<li>
    ${
      call.user.avatar_url
        ? html`<img
            src=${call.user.avatar_url}
            alt=""
            width="28"
            height="28"
            style="border-radius: 50%"
          />`
        : nothing
    }
    <span class="spacer"
      >${call.nick ?? call.user.global_name ?? call.user.username}</span
    >
    ${call.speaking ? html`<span class="chip success">Speaking</span>` : nothing}
    ${call.self_mute || call.server_mute ? html`<span class="chip">Muted</span>` : nothing}
    ${call.self_deaf || call.server_deaf ? html`<span class="chip">Deafened</span>` : nothing}
  </li>`;

export const discordDashboard = ({ data }: DashboardContext) => {
  const discord = data.discord;

  if (discord === undefined) return noData("Discord data");

  const members = discord.call?.members.map(member) ?? [];

  return html`
    <div class="dashboard">
      <sb-card class="third" heading="Status">
        <div class="row wrap">
          <span class="chip ${discord.connected ? "success" : "danger"}"
            ><span class="dot"></span
            >${discord.connected ? "Connected" : "Not connected"}</span
          >
          <span class="chip ${discord.authenticated ? "success" : ""}"
            >${discord.authenticated ? "Signed in" : "Not signed in"}</span
          >
        </div>
        ${facts([
          ["User", discord.user?.global_name ?? discord.user?.username],
          ["Muted", yesNo(discord.mute)],
          ["Deafened", yesNo(discord.deaf)],
          ["Video", yesNo(discord.video)],
          ["Screen share", yesNo(discord.screenshare)],
          [
            "Input volume",
            discord.input?.volume === null || discord.input === null
              ? null
              : formatNumber(discord.input.volume),
          ],
          [
            "Output volume",
            discord.output?.volume === null || discord.output === null
              ? null
              : formatNumber(discord.output.volume),
          ],
          ["Voice mode", discord.mode?.type],
          ["Noise suppression", yesNo(discord.processing?.noise_suppression)],
          ["Echo cancellation", yesNo(discord.processing?.echo_cancellation)],
        ])}
      </sb-card>
      <sb-card
        class="two-thirds"
        heading="Call"
        subheading=${
          discord.call === null
            ? "Not in a call"
            : [discord.call.server?.name, discord.call.channel.name]
                .filter(Boolean)
                .join(" · ")
        }
      >
        ${
          discord.call === null
            ? html`<div class="empty"><p>Not in a voice call.</p></div>`
            : html`<ul class="list">
                  ${members}
                </ul>
                ${facts([
                  ["Connection", discord.call.connection?.state],
                  [
                    "Ping",
                    discord.call.connection?.average_ping === null ||
                    discord.call.connection === null
                      ? null
                      : `${formatNumber(discord.call.connection.average_ping)} ms`,
                  ],
                ])}`
        }
      </sb-card>
      ${
        discord.notification === null
          ? nothing
          : html`<sb-card heading="Latest notification">
              <strong>${discord.notification.title}</strong>
              <p class="small">${discord.notification.body}</p>
            </sb-card>`
      }
    </div>
  `;
};
