import {
  mdiArrowDown,
  mdiArrowLeft,
  mdiArrowLeftBoldBoxOutline,
  mdiArrowRight,
  mdiArrowRightBoldBoxOutline,
  mdiArrowSplitVertical,
  mdiArrowUp,
  mdiChevronLeft,
  mdiChevronRight,
  mdiClose,
  mdiHeadset,
  mdiImageFilterCenterFocus,
  mdiKeyboardOutline,
  mdiLockOpenVariantOutline,
  mdiLockOutline,
  mdiMenuOpen,
  mdiMicrophone,
  mdiMonitorShare,
  mdiPlay,
  mdiReload,
  mdiTab,
  mdiViewQuiltOutline,
  mdiWebcam,
} from "@mdi/js";
import type {
  DesktopCompositor,
  DesktopWindow,
  DesktopWorkspace,
  DiscordCallMember,
  HyprlandBind,
  HyprlandData,
  HyprlandDisplay,
  HyprlandDispatcher,
  HyprlandGlobalShortcut,
  HyprlandReserved,
  HyprlandScreencast,
  HyprlandWindow,
  HyprlandWorkspace,
  OmarchyData,
  OmarchyFunction,
  OmarchyMenu,
  OmarchyPanel,
  OmarchyTarget,
  Process,
  SystemFailedUnit,
} from "@timmo001/effect-system-bridge";
import type { TableColumn } from "@timmo001/groundwork-ui/gw-table.ts";
import { Match } from "effect";
import { html, nothing, type TemplateResult } from "lit";

import "~/components/sb-action-alert";
import "@timmo001/groundwork-ui/define/gw-action-button.ts";
import "~/components/sb-hyprland-events";
import "~/components/sb-hyprland-tools";
import "~/components/sb-hyprland-option";
import "@timmo001/groundwork-ui/define/gw-select.ts";
import { selectValue } from "~/lib/select";
import "~/components/sb-system-power";
import "~/components/sb-omarchy-actions";
import "~/components/sb-process-actions";
import "~/components/sb-window-actions";
import "~/components/sb-workspace-actions";
import { cell } from "~/components/sb-table";
import { icon } from "~/components/shared-styles";
import {
  closeOmarchyMenu,
  desktopFailures,
  type HyprlandDirectionalDispatcher,
  hyprlandDispatch,
  hyprlandDispatchTowards,
  registry,
  reloadHyprlandConfig,
  runAction,
  runGlobalShortcut,
  setHyprlandSubmap,
  setKeyboardLayout,
} from "~/lib/atoms";
import {
  formatAgo,
  formatDateTime,
  formatNumber,
  formatPercent,
  formatPlayerStatus,
  formatUptime,
  formatWatts,
} from "~/lib/format";
import { shownMedia } from "~/lib/media";
import { href } from "~/lib/router";

import {
  type DashboardContext,
  facts,
  graphCard,
  noData,
  onTableChange,
  powerSeries,
  stat,
  tableView,
  yesNo,
} from "./shared";

export const systemDashboard = ({ data, history }: DashboardContext) => {
  const system = data.system;

  if (system === undefined) return noData("system data");

  const device = system.device_info;
  const failedUnits = system.failed_units ?? [];
  const power = powerSeries(data, history);

  const updates = (system.package_update_list ?? []).map(
    (update) =>
      html`<li>
        <span class="spacer truncate"><strong>${update.name}</strong></span>
        <span class="muted xsmall mono"
          >${
            update.current_version === null
              ? update.version
              : `${update.current_version} → ${update.version}`
          }</span
        >
      </li>`,
  );

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
          ? html`<gw-alert tone="warning" heading="An update is available">
              Version ${system.version_latest} is out; this is
              ${system.version}.
              <a href=${href("whatsNew")}>See what's new</a>
              ${
                system.version_latest_url === null
                  ? nothing
                  : html`·
                      <a
                        href=${system.version_latest_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        >Changes on GitHub</a
                      >`
              }
            </gw-alert>`
          : nothing
      }
      ${
        system.pending_reboot
          ? html`<gw-alert heading="Restart needed">
              Updates are waiting for a restart.
            </gw-alert>`
          : nothing
      }
      ${
        failedUnits.length > 0
          ? html`<gw-alert
              tone="warning"
              heading=${
                failedUnits.length === 1
                  ? "A systemd unit failed"
                  : `${failedUnits.length} systemd units failed`
              }
            >
              ${failedUnits.map((unit) => unit.name).join(", ")}
            </gw-alert>`
          : nothing
      }
      <gw-card
        heading=${system.hostname}
        description=${system.fqdn === system.hostname ? "" : system.fqdn}
      >
        <div class="stats">
          ${stat("Uptime", formatUptime(system.uptime))}
          ${stat("Platform", system.platform)}
          ${stat("Power", system.power_usage === null ? "" : formatWatts(system.power_usage))}
          ${stat("Users", String(system.users.length))}
          ${stat(
            "Last input",
            system.idle_time === null
              ? ""
              : system.idle_time < 60
                ? "Just now"
                : `${formatUptime(system.idle_time)} ago`,
          )}
          ${stat("Session", system.locked === null ? "" : system.locked ? "Locked" : "Unlocked")}
          ${stat(
            "Package updates",
            Match.value(system.package_updates).pipe(
              Match.when(Match.null, () => ""),
              Match.when(0, () => "Up to date"),
              Match.orElse((count) => `${count} waiting`),
            ),
          )}
        </div>
      </gw-card>
      ${
        power.length === 0
          ? nothing
          : graphCard({
              heading: "Power over time",
              label: "Power use over time",
              series: power,
              format: formatWatts,
              height: 220,
              width: "full",
            })
      }
      ${
        system.power_profile === null && system.keep_awake === null
          ? nothing
          : html`<gw-card class="half" heading="Power">
              <sb-system-power .system=${system}></sb-system-power>
            </gw-card>`
      }
      <gw-card class="third" heading="Software">
        ${facts([
          ["System Bridge", system.version],
          ["Platform version", system.platform_version],
          ["Kernel", system.kernel_version],
          ["Run mode", system.run_mode],
          ["Booted", formatDateTime(system.boot_time * 1000)],
          ["UUID", html`<span class="mono xsmall">${system.uuid}</span>`],
        ])}
      </gw-card>
      <gw-card class="third" heading="Network">
        ${facts([
          ["IPv4", system.ip_address_4],
          ["IPv6", system.ip_address_6],
          ["MAC address", system.mac_address],
        ])}
      </gw-card>
      <gw-card class="third" heading="Device">
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
      </gw-card>
      ${
        updates.length === 0
          ? nothing
          : html`<gw-card
              class="half"
              heading="Package updates"
              description=${`${updates.length} waiting`}
            >
              <ul class="list">
                ${updates}
              </ul>
            </gw-card>`
      }
      <gw-card class="half" heading="Users" description="Signed in now">
        ${
          users.length === 0
            ? html`<p class="muted small">Nobody is signed in.</p>`
            : html`<ul class="list">
                ${users}
              </ul>`
        }
      </gw-card>
      <gw-card
        class="half"
        heading="Privacy"
        description="Apps using the camera or microphone"
      >
        <ul class="list">
          <li>
            ${icon(mdiWebcam)}<span class="spacer">Camera</span>
            <gw-chip
              size="small"
              tone=${system.camera_usage.length > 0 ? "warning" : "neutral"}
            >
              ${system.camera_usage.length > 0 ? system.camera_usage.join(", ") : "Not in use"}
            </gw-chip>
          </li>
          <li>
            ${icon(mdiMicrophone)}<span class="spacer">Microphone</span>
            <gw-chip
              size="small"
              tone=${system.microphone_usage.length > 0 ? "warning" : "neutral"}
            >
              ${system.microphone_usage.length > 0 ? system.microphone_usage.join(", ") : "Not in use"}
            </gw-chip>
          </li>
        </ul>
      </gw-card>
      ${
        system.failed_units === null
          ? nothing
          : html`<gw-card heading="Failed units" description="From systemd">
              ${
                failedUnits.length === 0
                  ? html`<p class="muted small">Nothing has failed.</p>`
                  : html`<sb-table
                      label="Failed units"
                      search-label="Search failed units"
                      sort="name"
                      .columns=${failedUnitColumns}
                      .rows=${failedUnits}
                    ></sb-table>`
              }
            </gw-card>`
      }
    </div>
  `;
};

/** Text in the code font, such as a unit's or a bind's name. */
const mono = (text: string) =>
  cell(html`<span class="mono xsmall">${text}</span>`);

const failedUnitColumns: readonly TableColumn<SystemFailedUnit>[] = [
  { id: "name", header: "Unit", cell: (row) => mono(row.name) },
  { id: "description", header: "Description", wide: true },
  {
    id: "scope",
    header: "Scope",
    cell: (row) => (row.scope === "user" ? "User" : "System"),
  },
  { id: "result", header: "Result", value: (row) => row.result ?? "" },
  {
    id: "since",
    header: "Failed",
    value: (row) => row.since ?? 0,
    cell: (row) =>
      row.since === null || row.since === 0 ? "" : formatAgo(row.since * 1000),
  },
];

/**
 * A process's usage as a percentage. CPU usage already is one, but the
 * backend reports memory as a fraction of the total.
 */
export const usage = (process: Process, key: "cpu_usage" | "memory_usage") =>
  key === "memory_usage"
    ? (process.memory_usage ?? 0) * 100
    : (process.cpu_usage ?? 0);

const processColumns: readonly TableColumn<Process>[] = [
  {
    id: "name",
    header: "Name",
    value: (row) => row.name ?? "",
    cell: (row) =>
      cell(html`<span title=${row.path ?? ""}>${row.name ?? ""}</span>`),
  },
  { id: "id", header: "PID", numeric: true },
  {
    id: "cpu",
    header: "CPU",
    numeric: true,
    value: (row) => row.cpu_usage ?? 0,
    cell: (row) => formatPercent(row.cpu_usage ?? 0, 1),
  },
  {
    id: "memory",
    header: "Memory",
    numeric: true,
    value: (row) => usage(row, "memory_usage"),
    cell: (row) => formatPercent(usage(row, "memory_usage"), 1),
  },
  { id: "status", header: "Status", value: (row) => row.status ?? "" },
  { id: "user", header: "User", value: (row) => row.username ?? "" },
  { id: "path", header: "Path", wide: true, value: (row) => row.path ?? "" },
  {
    id: "actions",
    header: "Actions",
    sortable: false,
    searchable: false,
    value: () => null,
    cell: (row) =>
      cell(html`<sb-process-actions .process=${row}></sb-process-actions>`),
  },
];

export const top = (
  processes: readonly Process[],
  key: "cpu_usage" | "memory_usage",
  count = 6,
) =>
  [...processes]
    .filter((process) => usage(process, key) > 0)
    .sort((a, b) => usage(b, key) - usage(a, key))
    .slice(0, count);

export const processesDashboard = ({ data, location }: DashboardContext) => {
  const processes = data.processes;

  if (processes === undefined) return noData("processes");

  const view = tableView(location.search, { sort: "cpu", descending: true });

  const topList = (key: "cpu_usage" | "memory_usage") => {
    const busiest = top(processes, key);
    const max = Math.max(1, ...busiest.map((process) => usage(process, key)));

    const meters = busiest.map(
      (process) =>
        html`<gw-meter
          label="${process.name ?? "Unknown"} (${process.id})"
          .value=${usage(process, key)}
          .max=${max}
          display=${formatPercent(usage(process, key), 1)}
        ></gw-meter>`,
    );

    return meters.length === 0
      ? html`<p class="muted small">Nothing busy right now.</p>`
      : html`<div class="stack" style="--sb-stack-gap: var(--gw-space-3)">
          ${meters}
        </div>`;
  };

  return html`
    <div class="dashboard">
      <gw-card class="half" heading="Busiest" description="By CPU">
        ${topList("cpu_usage")}
      </gw-card>
      <gw-card class="half" heading="Largest" description="By memory">
        ${topList("memory_usage")}
      </gw-card>
      <gw-card
        heading="All processes"
        description="${processes.length} running"
      >
        <sb-table
          label="Processes"
          search-label="Search processes"
          row-key="id"
          .columns=${processColumns}
          .rows=${processes}
          .sort=${view.sort}
          .descending=${view.descending}
          .query=${view.query}
          @change=${onTableChange(location)}
        ></sb-table>
      </gw-card>
    </div>
  `;
};

export const mediaDashboard = ({ data, mediaPlayer }: DashboardContext) => {
  if (data.media === undefined) return noData("media");

  // The player picked above it on the page, or the backend's pick
  const media = shownMedia(data.media, mediaPlayer);

  return html`
    <div class="dashboard">
      <gw-card heading="Details">
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
      </gw-card>
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
    ${call.speaking ? html`<gw-chip size="small" tone="success">Speaking</gw-chip>` : nothing}
    ${call.self_mute || call.server_mute ? html`<gw-chip size="small">Muted</gw-chip>` : nothing}
    ${call.self_deaf || call.server_deaf ? html`<gw-chip size="small">Deafened</gw-chip>` : nothing}
  </li>`;

const hiddenTitle = html`<a
  href=${href("module", {
    params: { module: "desktop" },
    hash: "window-titles",
  })}
  >Hidden</a
>`;

const compositorName = {
  hyprland: "Hyprland",
  wayland: "Wayland",
  windows: "Windows",
} as const satisfies Record<DesktopCompositor, string>;

/** Chips for what's true of a window, besides being focused. */
const windowStates = (window: DesktopWindow, extra?: HyprlandWindow) => {
  const states = [
    window.fullscreen ? "Fullscreen" : null,
    window.maximised || extra?.fullscreen_mode === "maximised"
      ? "Maximised"
      : null,
    window.minimised ? "Minimised" : null,
    window.floating ? "Floating" : null,
    extra?.pinned ? "Pinned" : null,
    extra?.hidden ? "Hidden" : null,
    extra && extra.group.length > 0 ? "Grouped" : null,
    extra?.xwayland ? "XWayland" : null,
    window.inhibiting_idle ? "Keeping awake" : null,
  ].filter((state) => state !== null);

  const chips = states.map(
    (state) => html`<gw-chip size="small">${state}</gw-chip>`,
  );

  return html`${window.urgent ? html`<gw-chip size="small" tone="warning">Urgent</gw-chip>` : nothing}
  ${chips}`;
};

interface WindowRow {
  /** The window's, which the table keeps each row's place by. */
  readonly id: string;
  readonly window: DesktopWindow;
  readonly workspace: string;
  readonly extra: HyprlandWindow | undefined;
  readonly compositor: DesktopCompositor;
  readonly workspaces: readonly DesktopWorkspace[];
}

const windowColumns: readonly TableColumn<WindowRow>[] = [
  {
    id: "app",
    header: "App",
    value: (row) => row.window.app ?? "",
    cell: (row) =>
      cell(
        html`<span class="row">
          ${row.window.app ?? ""}
          ${row.window.focused ? html`<gw-chip size="small" tone="accent">Focused</gw-chip>` : nothing}
        </span>`,
      ),
  },
  {
    id: "title",
    header: "Title",
    wide: true,
    value: (row) => row.window.title ?? "",
    cell: (row) => cell(row.window.title ?? hiddenTitle),
  },
  { id: "workspace", header: "Workspace" },
  {
    id: "display",
    header: "Display",
    value: (row) => row.window.display ?? "",
  },
  {
    id: "size",
    header: "Size",
    sortable: false,
    value: (row) =>
      row.window.width === null || row.window.height === null
        ? ""
        : `${row.window.width} × ${row.window.height}`,
  },
  {
    id: "pid",
    header: "PID",
    numeric: true,
    value: (row) => row.window.pid ?? 0,
    cell: (row) => (row.window.pid ? String(row.window.pid) : ""),
  },
  {
    id: "state",
    header: "State",
    sortable: false,
    searchable: false,
    value: () => null,
    cell: (row) =>
      cell(
        html`<span class="row wrap"
          >${windowStates(row.window, row.extra)}</span
        >`,
      ),
  },
  {
    id: "actions",
    header: "Actions",
    sortable: false,
    searchable: false,
    value: () => null,
    cell: (row) =>
      cell(
        html`<sb-window-actions
          .window=${row.window}
          .extra=${row.extra}
          .compositor=${row.compositor}
          .workspaces=${row.workspaces}
        ></sb-window-actions>`,
      ),
  },
];

interface WorkspaceRow {
  /** The workspace's, which the table keeps each row's place by. */
  readonly id: string;
  readonly workspace: DesktopWorkspace;
  readonly extra: HyprlandWorkspace | undefined;
  /** The app of the window last focused on it, on Hyprland. */
  readonly lastApp: string;
  readonly compositor: DesktopCompositor;
  /** Where it can be moved to, on Hyprland. */
  readonly displays: readonly string[];
}

const workspaceColumns: readonly TableColumn<WorkspaceRow>[] = [
  {
    id: "name",
    header: "Name",
    value: (row) => row.workspace.name ?? row.workspace.id,
    cell: ({ workspace }) =>
      cell(
        html`<span class="row">
          ${workspace.name ?? workspace.id}
          ${workspace.focused ? html`<gw-chip size="small" tone="accent">Focused</gw-chip>` : workspace.active ? html`<gw-chip size="small">Shown</gw-chip>` : nothing}
        </span>`,
      ),
  },
  {
    id: "display",
    header: "Display",
    value: (row) => row.workspace.display ?? "",
  },
  {
    id: "windows",
    header: "Windows",
    numeric: true,
    value: (row) => row.workspace.windows ?? 0,
    cell: (row) =>
      row.workspace.windows === null ? "" : String(row.workspace.windows),
  },
  { id: "layout", header: "Layout", value: (row) => row.extra?.layout ?? "" },
  { id: "lastApp", header: "Last window" },
  {
    id: "state",
    header: "State",
    sortable: false,
    searchable: false,
    value: () => null,
    cell: ({ workspace, extra }) =>
      cell(
        html`<span class="row wrap">
          ${workspace.special ? html`<gw-chip size="small">Special</gw-chip>` : nothing}
          ${workspace.fullscreen ? html`<gw-chip size="small">Fullscreen</gw-chip>` : nothing}
          ${extra?.persistent ? html`<gw-chip size="small">Persistent</gw-chip>` : nothing}
        </span>`,
      ),
  },
  {
    id: "actions",
    header: "Actions",
    sortable: false,
    searchable: false,
    value: () => null,
    cell: (row) =>
      cell(
        html`<sb-workspace-actions
          .workspace=${row.workspace}
          .compositor=${row.compositor}
          .displays=${row.displays}
        ></sb-workspace-actions>`,
      ),
  },
];

const reserved = (edges: HyprlandReserved) =>
  (
    [
      ["top", edges.top],
      ["right", edges.right],
      ["bottom", edges.bottom],
      ["left", edges.left],
    ] as const
  )
    .flatMap(([edge, size]) => (size === 0 ? [] : [`${size}px ${edge}`]))
    .join(", ") || "None";

/** A Hyprland transform, which rotates anticlockwise and may flip first. */
const transformName = (transform: number) => {
  const rotation = (transform % 4) * 90;
  const flipped = transform >= 4;

  if (rotation === 0) return flipped ? "Flipped" : "None";

  return flipped ? `Flipped, ${rotation}°` : `${rotation}°`;
};

interface DisplayRow {
  readonly id: string;
  readonly display: HyprlandDisplay;
}

const displayColumns: readonly TableColumn<DisplayRow>[] = [
  { id: "id", header: "Display" },
  {
    id: "scale",
    header: "Scale",
    numeric: true,
    value: (row) => row.display.scale,
    cell: (row) => `${formatNumber(row.display.scale)}×`,
  },
  {
    id: "transform",
    header: "Transform",
    value: (row) => transformName(row.display.transform),
  },
  { id: "format", header: "Format", value: (row) => row.display.format ?? "" },
  {
    id: "colour",
    header: "Colour",
    value: (row) => row.display.colour_preset ?? "",
  },
  {
    id: "reserved",
    header: "Reserved",
    sortable: false,
    value: (row) => reserved(row.display.reserved),
  },
  {
    id: "layers",
    header: "Layers",
    sortable: false,
    wide: true,
    value: (row) =>
      [
        ...row.display.layers.background,
        ...row.display.layers.bottom,
        ...row.display.layers.top,
        ...row.display.layers.overlay,
      ].join(", "),
  },
  {
    id: "state",
    header: "State",
    sortable: false,
    searchable: false,
    value: () => null,
    cell: ({ display }) =>
      cell(
        html`<span class="row wrap">
          ${display.dpms ? nothing : html`<gw-chip size="small">Off</gw-chip>`}
          ${display.vrr ? html`<gw-chip size="small">VRR</gw-chip>` : nothing}
          ${display.tearing ? html`<gw-chip size="small">Tearing</gw-chip>` : nothing}
          ${display.direct_scanout ? html`<gw-chip size="small">Direct scanout</gw-chip>` : nothing}
          ${display.mirror_of === null ? nothing : html`<gw-chip size="small">Mirrors ${display.mirror_of}</gw-chip>`}
          ${display.special_workspace === null ? nothing : html`<gw-chip size="small">Special workspace shown</gw-chip>`}
        </span>`,
      ),
  },
];

interface InputRow {
  readonly name: string;
  readonly type: string;
  readonly details: string;
  readonly main: boolean;
}

const inputColumns: readonly TableColumn<InputRow>[] = [
  {
    id: "name",
    header: "Name",
    wide: true,
    cell: (row) =>
      cell(
        html`<span class="row">
          <span class="mono xsmall">${row.name}</span>
          ${row.main ? html`<gw-chip size="small" tone="accent">Last used</gw-chip>` : nothing}
        </span>`,
      ),
  },
  { id: "type", header: "Type" },
  { id: "details", header: "Details", sortable: false, wide: true },
];

const inputRows = (hyprland: HyprlandData): InputRow[] => [
  ...hyprland.keyboards.map((keyboard) => ({
    name: keyboard.name,
    type: "Keyboard",
    details: [
      keyboard.active_keymap,
      keyboard.layouts.length > 1 ? keyboard.layouts.join(", ") : null,
      keyboard.variant,
      keyboard.options,
    ]
      .filter(Boolean)
      .join(" · "),
    main: keyboard.main,
  })),
  ...hyprland.mice.map((mouse) => ({
    name: mouse.name,
    type: "Mouse",
    details: [
      `Speed ${formatNumber(mouse.speed)}`,
      mouse.scroll_factor < 0
        ? null
        : `Scroll ${formatNumber(mouse.scroll_factor)}×`,
    ]
      .filter(Boolean)
      .join(" · "),
    main: false,
  })),
  ...hyprland.switches.map((name) => ({
    name,
    type: "Switch",
    details: "",
    main: false,
  })),
  ...hyprland.tablets.map((name) => ({
    name,
    type: "Tablet",
    details: "",
    main: false,
  })),
  ...hyprland.touch.map((name) => ({
    name,
    type: "Touch",
    details: "",
    main: false,
  })),
];

const mouseButtons = new Map([
  ["mouse:272", "Left click"],
  ["mouse:273", "Right click"],
  ["mouse:274", "Middle click"],
  ["mouse_down", "Scroll down"],
  ["mouse_left", "Scroll left"],
  ["mouse_right", "Scroll right"],
  ["mouse_up", "Scroll up"],
]);

/** A bind's keys as you'd press them, such as SUPER + SHIFT + V. */
const bindKeys = (bind: HyprlandBind) =>
  [...bind.modifiers, mouseButtons.get(bind.key) ?? bind.key].join(" + ");

/** What a bind does, such as `exec kitty`, or Lua for a Lua bind. */
const bindAction = (bind: HyprlandBind) =>
  bind.dispatcher === null
    ? "Lua"
    : [bind.dispatcher, bind.argument].filter(Boolean).join(" ");

const bindColumns: readonly TableColumn<HyprlandBind>[] = [
  {
    id: "keys",
    header: "Keys",
    value: bindKeys,
    cell: (bind) => mono(bindKeys(bind)),
  },
  {
    id: "description",
    header: "Description",
    wide: true,
    value: (bind) => bind.description ?? "",
  },
  {
    id: "action",
    header: "Action",
    wide: true,
    value: bindAction,
    cell: (bind) => mono(bindAction(bind)),
  },
  { id: "submap", header: "Submap", value: (bind) => bind.submap ?? "" },
  {
    id: "flags",
    header: "Flags",
    sortable: false,
    searchable: false,
    value: () => null,
    cell: (bind) =>
      cell(
        html`<span class="row wrap">
          ${bind.locked ? html`<gw-chip size="small">Lock screen</gw-chip>` : nothing}
          ${bind.release ? html`<gw-chip size="small">On release</gw-chip>` : nothing}
          ${bind.repeat ? html`<gw-chip size="small">Repeats</gw-chip>` : nothing}
          ${bind.long_press ? html`<gw-chip size="small">Long press</gw-chip>` : nothing}
          ${bind.non_consuming ? html`<gw-chip size="small">Passes through</gw-chip>` : nothing}
        </span>`,
      ),
  },
];

interface ShortcutRow {
  readonly shortcut: HyprlandGlobalShortcut;
  readonly keys: string;
}

const shortcutColumns: readonly TableColumn<ShortcutRow>[] = [
  {
    id: "description",
    header: "Description",
    value: (row) => row.shortcut.description,
  },
  {
    id: "name",
    header: "Name",
    value: (row) => row.shortcut.name,
    cell: (row) => mono(row.shortcut.name),
  },
  { id: "keys", header: "Keys", cell: (row) => mono(row.keys) },
  {
    id: "actions",
    header: "Action",
    sortable: false,
    searchable: false,
    value: () => null,
    cell: ({ shortcut }) =>
      cell(
        html`<gw-action-button
          variant="neutral"
          appearance="plain"
          size="small"
          labels="hide"
          icon=${mdiPlay}
          .action=${runAction(runGlobalShortcut(shortcut.name))}
          >${shortcut.description || shortcut.name}</gw-action-button
        >`,
      ),
  },
];

/**
 * Each shortcut with the keys bound to it. Only binds that use the global
 * dispatcher say which shortcut they trigger, which Lua binds don't.
 */
const shortcutRows = (hyprland: HyprlandData): ShortcutRow[] =>
  hyprland.global_shortcuts.map((shortcut) => ({
    shortcut,
    keys: hyprland.binds
      .filter(
        (bind) =>
          bind.dispatcher === "global" && bind.argument === shortcut.name,
      )
      .map(bindKeys)
      .join(", "),
  }));

const directionIcons = [
  ["left", "Left", mdiArrowLeft],
  ["down", "Down", mdiArrowDown],
  ["up", "Up", mdiArrowUp],
  ["right", "Right", mdiArrowRight],
] as const;

/** Buttons that run a dispatcher towards each direction, like h, j, k and l. */
const directionButtons = (
  dispatcher: HyprlandDirectionalDispatcher,
  verb: string,
) =>
  directionIcons.map(
    ([direction, name, path]) =>
      html`<gw-action-button
        variant="neutral"
        appearance="plain"
        size="small"
        labels="hide"
        quiet
        icon=${path}
        .action=${runAction(hyprlandDispatchTowards(dispatcher)(direction))}
        >${verb} ${name.toLowerCase()}</gw-action-button
      >`,
  );

const dispatcherButtons = [
  ["center_window", "Center", mdiImageFilterCenterFocus],
  ["cycle_next_window", "Next window", mdiArrowRightBoldBoxOutline],
  ["cycle_previous_window", "Previous window", mdiArrowLeftBoldBoxOutline],
  ["toggle_group", "Toggle group", mdiTab],
  ["toggle_split", "Toggle split", mdiArrowSplitVertical],
] as const;

const groupButtons = [
  ["group_previous", "Previous", mdiChevronLeft],
  ["group_next", "Next", mdiChevronRight],
  ["lock_group", "Lock", mdiLockOutline],
  ["unlock_group", "Unlock", mdiLockOpenVariantOutline],
] as const;

const allGroupButtons = [
  ["lock_groups", "Lock all", mdiLockOutline],
  ["unlock_groups", "Unlock all", mdiLockOpenVariantOutline],
] as const;

const dispatcherButton = ([dispatcher, label, path]: readonly [
  HyprlandDispatcher,
  string,
  string,
]) =>
  html`<gw-action-button
    variant="neutral"
    appearance="plain"
    size="small"
    quiet
    icon=${path}
    .action=${runAction(hyprlandDispatch(dispatcher))}
    >${label}</gw-action-button
  >`;

const dispatcherCard = () => {
  const buttons = dispatcherButtons.map(dispatcherButton);
  const group = groupButtons.map(dispatcherButton);
  const allGroups = allGroupButtons.map(dispatcherButton);

  return html`
    <gw-card class="half" heading="Focused window" description="Dispatchers">
      ${facts([
        [
          "Move focus",
          html`<div class="row">
            ${directionButtons("move_focus", "Focus")}
          </div>`,
        ],
        [
          "Swap",
          html`<div class="row">
            ${directionButtons("swap_window", "Swap")}
          </div>`,
        ],
        ["Group", html`<div class="row wrap">${group}</div>`],
        ["All groups", html`<div class="row wrap">${allGroups}</div>`],
      ])}
      <div class="row wrap">${buttons}</div>
    </gw-card>
  `;
};

const omarchyMenuColumns: readonly TableColumn<OmarchyMenu>[] = [
  { id: "name", header: "Name" },
  { id: "id", header: "Route", cell: (menu) => mono(menu.id) },
  {
    id: "aliases",
    header: "Aliases",
    wide: true,
    value: (menu) => menu.aliases.join(", "),
    cell: (menu) => mono(menu.aliases.join(", ")),
  },
  {
    id: "actions",
    header: "Action",
    sortable: false,
    searchable: false,
    value: () => null,
    cell: (menu) =>
      cell(
        html`<sb-omarchy-actions
          kind="menu"
          .item=${menu}
        ></sb-omarchy-actions>`,
      ),
  },
];

const omarchyPanelColumns: readonly TableColumn<OmarchyPanel>[] = [
  { id: "name", header: "Name" },
  { id: "id", header: "ID", cell: (panel) => mono(panel.id) },
  {
    id: "actions",
    header: "Action",
    sortable: false,
    searchable: false,
    value: () => null,
    cell: (panel) =>
      cell(
        html`<sb-omarchy-actions
          kind="panel"
          .item=${panel}
        ></sb-omarchy-actions>`,
      ),
  },
];

/** How a function is called, such as `seek(seconds: int): void`. */
const omarchySignature = (fn: OmarchyFunction) =>
  `${fn.name}(${fn.arguments
    .map((argument) => `${argument.name}: ${argument.type}`)
    .join(", ")}): ${fn.returns}`;

/** A target's functions, as they're called. */
const omarchyFunctions = (target: OmarchyTarget) =>
  target.functions.map(omarchySignature).join(", ");

const omarchyTargetColumns: readonly TableColumn<OmarchyTarget>[] = [
  { id: "name", header: "Target", cell: (target) => mono(target.name) },
  {
    id: "functions",
    header: "Functions",
    wide: true,
    value: omarchyFunctions,
    cell: (target) => mono(omarchyFunctions(target)),
  },
];

/**
 * Cards only one desktop has, under their own heading, so the cards every
 * desktop has read the same everywhere.
 */
const dashboardSection = (section: {
  readonly id: string;
  readonly heading: string;
  readonly description: string;
  readonly icon: string;
  readonly actions?: TemplateResult;
  readonly cards: TemplateResult;
}) => html`
  <section class="dashboard-section" id=${section.id}>
    <gw-page-header
      level="2"
      heading=${section.heading}
      description=${section.description}
      icon=${section.icon}
    >
      ${
        section.actions === undefined
          ? nothing
          : html`<div slot="actions" class="actions">${section.actions}</div>`
      }
    </gw-page-header>
    <div class="dashboard">${section.cards}</div>
  </section>
`;

const omarchyCards = (omarchy: OmarchyData) => html`
  <gw-card heading="Menus" description="${omarchy.menus.length} routes">
    <gw-action-button
      slot="actions"
      variant="neutral"
      appearance="plain"
      size="small"
      quiet
      icon=${mdiClose}
      .action=${runAction(closeOmarchyMenu)}
      >Close menu</gw-action-button
    >
    <!-- By route, which groups them by where they sit in the menu -->
    <sb-table
      label="Omarchy menus"
      search-label="Search menus"
      sort="id"
      row-key="id"
      .columns=${omarchyMenuColumns}
      .rows=${omarchy.menus}
    ></sb-table>
  </gw-card>
  <gw-card
    heading="Panels"
    description="${omarchy.panels.length} from enabled plugins"
  >
    <sb-table
      label="Omarchy panels"
      search-label="Search panels"
      sort="name"
      row-key="id"
      .columns=${omarchyPanelColumns}
      .rows=${omarchy.panels}
    ></sb-table>
  </gw-card>
  <gw-card heading="Shell IPC" description="${omarchy.targets.length} targets">
    <sb-table
      label="Omarchy shell IPC targets"
      search-label="Search targets"
      sort="name"
      row-key="name"
      .columns=${omarchyTargetColumns}
      .rows=${omarchy.targets}
    ></sb-table>
  </gw-card>
`;

const onSubmap = (event: Event) => {
  registry.set(setHyprlandSubmap, selectValue(event));
};

const hyprlandCards = (hyprland: HyprlandData) => {
  const displays = Object.entries(hyprland.displays).map(([id, display]) => ({
    id,
    display,
  }));

  const inputs = inputRows(hyprland);

  const shortcuts = shortcutRows(hyprland);

  const submaps = [
    ...new Set(hyprland.binds.flatMap((bind) => bind.submap ?? [])),
  ].map((submap) => ({ value: submap, label: submap }));

  const options = hyprland.options.map(
    (option) =>
      [
        option.name,
        html`<sb-hyprland-option .option=${option}></sb-hyprland-option>`,
      ] as const,
  );

  return html`
    <gw-card class="half" heading="Details">
      ${facts([
        ["Version", hyprland.version.version],
        [
          "Commit",
          html`<span class="mono xsmall"
            >${hyprland.version.commit.slice(0, 12)}</span
          >`,
        ],
        ["Branch", hyprland.version.branch],
        ["Config", hyprland.version.config_provider],
        ["Backend", hyprland.version.backend],
        [
          "Submap",
          submaps.length === 0
            ? (hyprland.submap ?? "Default")
            : html`<gw-select
                label="Submap"
                label-hidden
                size="small"
                .options=${[{ value: "", label: "Default" }, ...submaps]}
                .value=${hyprland.submap ?? ""}
                @change=${onSubmap}
              ></gw-select>`,
        ],
        ["Group lock", yesNo(hyprland.group_lock)],
      ])}
    </gw-card>
    ${dispatcherCard()}
    ${
      options.length === 0
        ? nothing
        : html`<gw-card
            class="half"
            heading="Options"
            description="Until the config reloads"
          >
            ${facts(options)}
          </gw-card>`
    }
    <gw-card class="half" heading="Custom events" description="Sent by binds">
      <sb-hyprland-events></sb-hyprland-events>
    </gw-card>
    <gw-card
      class="half"
      heading="Tools"
      description="Options, the cursor, the log and code"
    >
      <sb-hyprland-tools></sb-hyprland-tools>
    </gw-card>
    <gw-card heading="Displays" description="As Hyprland sees them">
      <sb-table
        label="Displays"
        search-label="Search displays"
        sort="id"
        row-key="id"
        .columns=${displayColumns}
        .rows=${displays}
      ></sb-table>
    </gw-card>
    <gw-card heading="Global shortcuts" description="Registered by apps">
      <sb-table
        label="Global shortcuts"
        search-label="Search shortcuts"
        sort="description"
        .columns=${shortcutColumns}
        .rows=${shortcuts}
      ></sb-table>
    </gw-card>
    <gw-card heading="Input devices" description="${inputs.length} connected">
      <sb-table
        label="Input devices"
        search-label="Search input devices"
        sort="type"
        .columns=${inputColumns}
        .rows=${inputs}
      ></sb-table>
    </gw-card>
    <gw-card
      heading="Key bindings"
      description="${hyprland.binds.length} in the config"
    >
      <!-- Unsorted, so binds keep the config's order -->
      <sb-table
        label="Key bindings"
        search-label="Search key bindings"
        .columns=${bindColumns}
        .rows=${hyprland.binds}
      ></sb-table>
    </gw-card>
  `;
};

/** What a screen share is sharing, such as a window's app. */
const screencastLabel = (
  screencast: HyprlandScreencast,
  windows: readonly DesktopWindow[],
) => {
  switch (screencast.type) {
    case "monitor":
      return `Display ${screencast.display ?? ""}`.trim();
    case "region":
      return "A region";
    case "window": {
      const app = windows.find(
        (window) => window.id === screencast.window,
      )?.app;

      return app ? `A window of ${app}` : "A window";
    }
  }
};

export const desktopDashboard = ({ data, location }: DashboardContext) => {
  const desktop = data.desktop;

  if (!desktop) return noData("desktop");

  const hyprland = desktop.hyprland;

  const workspaceNames = new Map(
    desktop.workspaces.map((workspace) => [
      workspace.id,
      workspace.name ?? workspace.id,
    ]),
  );

  const focused = desktop.windows.find(
    (window) => window.id === desktop.focused_window,
  );

  const windowView = tableView(location.search, {
    sort: "app",
    descending: false,
  });

  const rows = desktop.windows.map((window): WindowRow => ({
    id: window.id,
    window,
    workspace:
      window.workspace === null
        ? ""
        : (workspaceNames.get(window.workspace) ?? window.workspace),
    extra: hyprland?.windows[window.id],
    compositor: desktop.compositor,
    workspaces: desktop.workspaces,
  }));

  const configErrors = (hyprland?.config_errors ?? []).map(
    (error) => html`<li>${error}</li>`,
  );

  const configNotices = (hyprland?.config_notices ?? []).map(
    (notice) => html`<li>${notice}</li>`,
  );

  const screencasts = (hyprland?.screencasts ?? [])
    .map((screencast) => screencastLabel(screencast, desktop.windows))
    .join(", ");

  const apps = new Map(
    desktop.windows.map((window) => [window.id, window.app ?? ""]),
  );

  const displays = Object.keys(hyprland?.displays ?? {});

  const workspaces = desktop.workspaces.map((workspace): WorkspaceRow => {
    const extra = hyprland?.workspaces[workspace.id];

    return {
      id: workspace.id,
      workspace,
      extra,
      lastApp: apps.get(extra?.last_window ?? "") ?? "",
      compositor: desktop.compositor,
      displays,
    };
  });

  const failures = desktopFailures(
    [
      ...(desktop.omarchy?.menus ?? []).map((menu) => `menu:${menu.id}`),
      ...(desktop.omarchy?.panels ?? []).map((panel) => `panel:${panel.id}`),
    ].join("\n"),
  );

  // Other Wayland desktops can't switch layouts for you
  const layouts =
    desktop.compositor === "wayland"
      ? []
      : desktop.keyboard.layouts.flatMap((layout) =>
          layout === desktop.keyboard.layout
            ? []
            : [
                html`<gw-action-button
                  variant="neutral"
                  appearance="plain"
                  size="small"
                  icon=${mdiKeyboardOutline}
                  .action=${runAction(setKeyboardLayout(layout))}
                  >${layout}</gw-action-button
                >`,
              ],
        );

  return html`
    <div class="dashboard">
      <sb-action-alert .failures=${failures}></sb-action-alert>
      ${
        configErrors.length === 0
          ? nothing
          : html`<gw-alert
              tone="warning"
              heading="Hyprland's config has errors"
            >
              <ul>
                ${configErrors}
              </ul>
            </gw-alert>`
      }
      ${
        configNotices.length === 0
          ? nothing
          : html`<gw-alert heading="Hyprland's config uses deprecated settings">
              <ul>
                ${configNotices}
              </ul>
            </gw-alert>`
      }
      ${
        screencasts === ""
          ? nothing
          : html`<gw-alert heading="Your screen is being shared">
              <span slot="icon" class="row">${icon(mdiMonitorShare)}</span>
              ${screencasts}
            </gw-alert>`
      }
      <gw-card
        heading=${compositorName[desktop.compositor]}
        description=${hyprland === null ? "" : hyprland.version.version}
      >
        ${
          focused === undefined
            ? nothing
            : html`<div class="focused-window">
                <span class="name">Focused window</span>
                <span class="title">${focused.title ?? focused.app}</span>
                ${focused.title ? html`<span class="app">${focused.app}</span>` : nothing}
              </div>`
        }
        <div class="stats">
          ${stat(
            "Workspace",
            desktop.focused_workspace === null
              ? ""
              : (workspaceNames.get(desktop.focused_workspace) ??
                  desktop.focused_workspace),
          )}
          ${desktop.focused_display === null ? nothing : stat("Display", desktop.focused_display)}
          ${stat("Keyboard", desktop.keyboard.name ?? desktop.keyboard.layout ?? "")}
          ${stat("Windows", String(desktop.windows.length))}
          ${stat("Workspaces", desktop.workspaces.length === 0 ? "" : String(desktop.workspaces.length))}
        </div>
      </gw-card>
      <gw-card heading="Windows" description="${desktop.windows.length} open">
        <sb-table
          label="Windows"
          search-label="Search windows"
          row-key="id"
          .columns=${windowColumns}
          .rows=${rows}
          .sort=${windowView.sort}
          .descending=${windowView.descending}
          .query=${windowView.query}
          @change=${onTableChange(location)}
        ></sb-table>
      </gw-card>
      ${
        desktop.workspaces.length === 0
          ? nothing
          : html`<gw-card heading="Workspaces">
              <!-- Unsorted, so workspaces keep their ID order -->
              <sb-table
                label="Workspaces"
                search-label="Search workspaces"
                row-key="id"
                .columns=${workspaceColumns}
                .rows=${workspaces}
              ></sb-table>
            </gw-card>`
      }
      <gw-card class="half" heading="Keyboard layout">
        ${facts([
          ["Layout", desktop.keyboard.layout],
          ["Name", desktop.keyboard.name],
          ["Installed", desktop.keyboard.layouts.join(", ")],
        ])}
        ${
          layouts.length === 0
            ? nothing
            : html`<div class="row wrap">
                <span class="muted small">Switch to</span>
                ${layouts}
              </div>`
        }
      </gw-card>
    </div>
    ${
      hyprland === null
        ? nothing
        : dashboardSection({
            id: "hyprland",
            heading: "Hyprland",
            description: "What only Hyprland reports, and its controls",
            icon: mdiViewQuiltOutline,
            actions: html`<gw-action-button
              variant="neutral"
              appearance="plain"
              size="small"
              quiet
              icon=${mdiReload}
              .action=${runAction(reloadHyprlandConfig)}
              >Reload config</gw-action-button
            >`,
            cards: hyprlandCards(hyprland),
          })
    }
    ${
      desktop.omarchy === null
        ? nothing
        : dashboardSection({
            id: "omarchy",
            heading: "Omarchy",
            description: "The Omarchy shell's menus, panels and IPC",
            icon: mdiMenuOpen,
            cards: omarchyCards(desktop.omarchy),
          })
    }
  `;
};

export const discordDashboard = ({ data }: DashboardContext) => {
  const discord = data.discord;

  // The module only exists once Discord is set up
  if (discord === undefined) {
    return html`<gw-card>
      <gw-empty-state icon=${mdiHeadset} heading="Discord isn't set up yet">
        <p>
          Connect System Bridge to the Discord desktop app to see your voice
          settings and calls here.
        </p>
        <gw-button
          slot="actions"
          href=${href("module", {
            params: { module: "discord" },
            hash: "discord-setup",
          })}
          >Set up Discord</gw-button
        >
      </gw-empty-state>
    </gw-card>`;
  }

  const members = discord.call?.members.map(member) ?? [];

  return html`
    <div class="dashboard">
      <gw-card class="third" heading="Status">
        <div class="row wrap">
          <gw-chip size="small" tone=${discord.connected ? "success" : "danger"}
            ><gw-dot
              slot="icon"
              tone=${discord.connected ? "success" : "danger"}
            ></gw-dot
            >${discord.connected ? "Connected" : "Not connected"}</gw-chip
          >
          <gw-chip
            size="small"
            tone=${discord.authenticated ? "success" : "neutral"}
            >${discord.authenticated ? "Signed in" : "Not signed in"}</gw-chip
          >
        </div>
        ${
          discord.error
            ? html`<gw-alert
                tone="danger"
                urgent
                heading="Couldn't connect to Discord"
              >
                ${discord.error}
                <a
                  href=${href("module", {
                    params: { module: "discord" },
                    hash: "discord-setup",
                  })}
                  >Check the setup</a
                >
              </gw-alert>`
            : nothing
        }
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
      </gw-card>
      <gw-card
        class="two-thirds"
        heading="Call"
        description=${
          discord.call === null
            ? "Not in a call"
            : [discord.call.server?.name, discord.call.channel.name]
                .filter(Boolean)
                .join(" · ")
        }
      >
        ${
          discord.call === null
            ? html`<gw-empty-state><p>Not in a voice call.</p></gw-empty-state>`
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
      </gw-card>
      ${
        discord.notification === null
          ? nothing
          : html`<gw-card heading="Latest notification">
              <strong>${discord.notification.title}</strong>
              <p class="small">${discord.notification.body}</p>
            </gw-card>`
      }
    </div>
  `;
};
