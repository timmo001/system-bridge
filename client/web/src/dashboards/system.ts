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
import { html, nothing, type TemplateResult } from "lit";

import "~/components/sb-action-alert";
import "~/components/sb-action-button";
import "~/components/sb-hyprland-events";
import "~/components/sb-hyprland-tools";
import "~/components/sb-hyprland-option";
import "@timmo001/groundwork-ui/gw-select.ts";
import { selectValue } from "~/lib/select";
import "~/components/sb-system-power";
import { dataTableColumns } from "~/components/sb-data-table";
import "~/components/sb-omarchy-actions";
import "~/components/sb-process-actions";
import "~/components/sb-window-actions";
import "~/components/sb-workspace-actions";
import { icon } from "~/components/shared-styles";
import {
  closeOmarchyMenu,
  desktopFailures,
  type HyprlandDirectionalDispatcher,
  hyprlandDispatch,
  hyprlandDispatchTowards,
  registry,
  reloadHyprlandConfig,
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
  tableState,
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
            system.package_updates === null
              ? ""
              : system.package_updates === 0
                ? "Up to date"
                : `${system.package_updates} waiting`,
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
      </gw-card>
      ${
        system.failed_units === null
          ? nothing
          : html`<gw-card heading="Failed units" description="From systemd">
              ${
                failedUnits.length === 0
                  ? html`<p class="muted small">Nothing has failed.</p>`
                  : html`<sb-data-table
                      local
                      label="Failed units"
                      search-placeholder="Search failed units"
                      .columns=${failedUnitColumns}
                      .data=${failedUnits}
                      .rowId=${failedUnitId}
                      .wide=${["description"]}
                      .state=${failedUnitTableState}
                    ></sb-data-table>`
              }
            </gw-card>`
      }
    </div>
  `;
};

const failedUnitColumns = (() => {
  const column = dataTableColumns<SystemFailedUnit>();

  return column.columns([
    column.accessor("name", {
      header: "Unit",
      cell: ({ getValue }) =>
        html`<span class="mono xsmall">${getValue()}</span>`,
    }),
    column.accessor("description", { header: "Description" }),
    column.accessor("scope", {
      header: "Scope",
      cell: ({ getValue }) => (getValue() === "user" ? "User" : "System"),
    }),
    column.accessor((row) => row.result ?? "", {
      id: "result",
      header: "Result",
    }),
    column.accessor((row) => row.since ?? 0, {
      id: "since",
      header: "Failed",
      cell: ({ getValue }) => {
        const since = getValue();

        return since === 0 ? "" : formatAgo(since * 1000);
      },
    }),
  ]);
})();

const failedUnitId = (unit: SystemFailedUnit) => `${unit.scope}:${unit.name}`;

const failedUnitTableState = {
  filter: "",
  sort: "name",
  descending: false,
  page: 1,
  pageSize: undefined,
};

/**
 * A process's usage as a percentage. CPU usage already is one, but the
 * backend reports memory as a fraction of the total.
 */
export const usage = (process: Process, key: "cpu_usage" | "memory_usage") =>
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
    column.display({
      id: "actions",
      header: "Actions",
      cell: ({ row }) =>
        html`<sb-process-actions
          .process=${row.original}
        ></sb-process-actions>`,
    }),
  ]);
})();

const processId = (row: Process) => String(row.id);

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
      : html`<div class="stack" style="--sb-stack-gap: var(--sb-space-3)">
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
    ${call.speaking ? html`<span class="chip success">Speaking</span>` : nothing}
    ${call.self_mute || call.server_mute ? html`<span class="chip">Muted</span>` : nothing}
    ${call.self_deaf || call.server_deaf ? html`<span class="chip">Deafened</span>` : nothing}
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

  const chips = states.map((state) => html`<span class="chip">${state}</span>`);

  return html`${window.urgent ? html`<span class="chip warning">Urgent</span>` : nothing}
  ${chips}`;
};

interface WindowRow {
  readonly window: DesktopWindow;
  readonly workspace: string;
  readonly extra: HyprlandWindow | undefined;
  readonly compositor: DesktopCompositor;
  readonly workspaces: readonly DesktopWorkspace[];
}

const windowColumns = (() => {
  const column = dataTableColumns<WindowRow>();

  return column.columns([
    column.accessor((row) => row.window.app ?? "", {
      id: "app",
      header: "App",
      cell: ({ getValue, row }) =>
        html`<span class="row">
          ${getValue()}
          ${row.original.window.focused ? html`<span class="chip accent">Focused</span>` : nothing}
        </span>`,
    }),
    column.accessor((row) => row.window.title ?? "", {
      id: "title",
      header: "Title",
      cell: ({ row }) => row.original.window.title ?? hiddenTitle,
    }),
    column.accessor("workspace", { header: "Workspace" }),
    column.accessor((row) => row.window.display ?? "", {
      id: "display",
      header: "Display",
    }),
    column.accessor(
      (row) =>
        row.window.width === null || row.window.height === null
          ? ""
          : `${row.window.width} × ${row.window.height}`,
      { id: "size", header: "Size", enableSorting: false },
    ),
    column.accessor((row) => row.window.pid ?? 0, {
      id: "pid",
      header: "PID",
      cell: ({ getValue }) => getValue() || "",
    }),
    column.display({
      id: "state",
      header: "State",
      cell: ({ row }) =>
        html`<span class="row wrap"
          >${windowStates(row.original.window, row.original.extra)}</span
        >`,
    }),
    column.display({
      id: "actions",
      header: "Actions",
      cell: ({ row }) =>
        html`<sb-window-actions
          .window=${row.original.window}
          .extra=${row.original.extra}
          .compositor=${row.original.compositor}
          .workspaces=${row.original.workspaces}
        ></sb-window-actions>`,
    }),
  ]);
})();

const windowId = (row: WindowRow) => row.window.id;

interface WorkspaceRow {
  readonly workspace: DesktopWorkspace;
  readonly extra: HyprlandWorkspace | undefined;
  /** The app of the window last focused on it, on Hyprland. */
  readonly lastApp: string;
  readonly compositor: DesktopCompositor;
  /** Where it can be moved to, on Hyprland. */
  readonly displays: readonly string[];
}

const workspaceColumns = (() => {
  const column = dataTableColumns<WorkspaceRow>();

  return column.columns([
    column.accessor((row) => row.workspace.name ?? row.workspace.id, {
      id: "name",
      header: "Name",
      cell: ({ getValue, row }) => {
        const { workspace } = row.original;

        return html`<span class="row">
          ${getValue()}
          ${workspace.focused ? html`<span class="chip accent">Focused</span>` : workspace.active ? html`<span class="chip">Shown</span>` : nothing}
        </span>`;
      },
    }),
    column.accessor((row) => row.workspace.display ?? "", {
      id: "display",
      header: "Display",
    }),
    column.accessor((row) => row.workspace.windows ?? 0, {
      id: "windows",
      header: "Windows",
      cell: ({ row }) => row.original.workspace.windows ?? "",
    }),
    column.accessor((row) => row.extra?.layout ?? "", {
      id: "layout",
      header: "Layout",
    }),
    column.accessor("lastApp", { header: "Last window" }),
    column.display({
      id: "state",
      header: "State",
      cell: ({ row }) => {
        const { workspace, extra } = row.original;

        return html`<span class="row wrap">
          ${workspace.special ? html`<span class="chip">Special</span>` : nothing}
          ${workspace.fullscreen ? html`<span class="chip">Fullscreen</span>` : nothing}
          ${extra?.persistent ? html`<span class="chip">Persistent</span>` : nothing}
        </span>`;
      },
    }),
    column.display({
      id: "actions",
      header: "Actions",
      cell: ({ row }) =>
        html`<sb-workspace-actions
          .workspace=${row.original.workspace}
          .compositor=${row.original.compositor}
          .displays=${row.original.displays}
        ></sb-workspace-actions>`,
    }),
  ]);
})();

const workspaceId = (row: WorkspaceRow) => row.workspace.id;

// Unsorted, so workspaces keep their ID order
const workspaceTableState = {
  filter: "",
  sort: undefined,
  descending: false,
  page: 1,
  pageSize: undefined,
};

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

const displayColumns = (() => {
  const column = dataTableColumns<DisplayRow>();

  return column.columns([
    column.accessor("id", { header: "Display" }),
    column.accessor((row) => row.display.scale, {
      id: "scale",
      header: "Scale",
      cell: ({ getValue }) => `${formatNumber(getValue())}×`,
    }),
    column.accessor((row) => transformName(row.display.transform), {
      id: "transform",
      header: "Transform",
    }),
    column.accessor((row) => row.display.format ?? "", {
      id: "format",
      header: "Format",
    }),
    column.accessor((row) => row.display.colour_preset ?? "", {
      id: "colour",
      header: "Colour",
    }),
    column.accessor((row) => reserved(row.display.reserved), {
      id: "reserved",
      header: "Reserved",
      enableSorting: false,
    }),
    column.accessor(
      (row) =>
        [
          ...row.display.layers.background,
          ...row.display.layers.bottom,
          ...row.display.layers.top,
          ...row.display.layers.overlay,
        ].join(", "),
      { id: "layers", header: "Layers", enableSorting: false },
    ),
    column.display({
      id: "state",
      header: "State",
      cell: ({ row }) => {
        const { display } = row.original;

        return html`<span class="row wrap">
          ${display.dpms ? nothing : html`<span class="chip">Off</span>`}
          ${display.vrr ? html`<span class="chip">VRR</span>` : nothing}
          ${display.tearing ? html`<span class="chip">Tearing</span>` : nothing}
          ${display.direct_scanout ? html`<span class="chip">Direct scanout</span>` : nothing}
          ${display.mirror_of === null ? nothing : html`<span class="chip">Mirrors ${display.mirror_of}</span>`}
          ${display.special_workspace === null ? nothing : html`<span class="chip">Special workspace shown</span>`}
        </span>`;
      },
    }),
  ]);
})();

const displayId = (row: DisplayRow) => row.id;

interface InputRow {
  readonly name: string;
  readonly type: string;
  readonly details: string;
  readonly main: boolean;
}

const inputColumns = (() => {
  const column = dataTableColumns<InputRow>();

  return column.columns([
    column.accessor("name", {
      header: "Name",
      cell: ({ getValue, row }) =>
        html`<span class="row">
          <span class="mono xsmall">${getValue()}</span>
          ${row.original.main ? html`<span class="chip accent">Last used</span>` : nothing}
        </span>`,
    }),
    column.accessor("type", { header: "Type" }),
    column.accessor("details", {
      header: "Details",
      enableSorting: false,
    }),
  ]);
})();

const inputId = (row: InputRow) => `${row.type}:${row.name}`;

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

const bindColumns = (() => {
  const column = dataTableColumns<HyprlandBind>();

  return column.columns([
    column.accessor(bindKeys, {
      id: "keys",
      header: "Keys",
      cell: ({ getValue }) =>
        html`<span class="mono xsmall">${getValue()}</span>`,
    }),
    column.accessor((bind) => bind.description ?? "", {
      id: "description",
      header: "Description",
    }),
    column.accessor(
      (bind) =>
        bind.dispatcher === null
          ? "Lua"
          : [bind.dispatcher, bind.argument].filter(Boolean).join(" "),
      {
        id: "action",
        header: "Action",
        cell: ({ getValue }) =>
          html`<span class="mono xsmall">${getValue()}</span>`,
      },
    ),
    column.accessor((bind) => bind.submap ?? "", {
      id: "submap",
      header: "Submap",
    }),
    column.display({
      id: "flags",
      header: "Flags",
      cell: ({ row }) => {
        const bind = row.original;

        return html`<span class="row wrap">
          ${bind.locked ? html`<span class="chip">Lock screen</span>` : nothing}
          ${bind.release ? html`<span class="chip">On release</span>` : nothing}
          ${bind.repeat ? html`<span class="chip">Repeats</span>` : nothing}
          ${bind.long_press ? html`<span class="chip">Long press</span>` : nothing}
          ${bind.non_consuming ? html`<span class="chip">Passes through</span>` : nothing}
        </span>`;
      },
    }),
  ]);
})();

const bindId = (bind: HyprlandBind, index: number) =>
  `${bind.submap ?? ""}:${bindKeys(bind)}:${index}`;

interface ShortcutRow {
  readonly shortcut: HyprlandGlobalShortcut;
  readonly keys: string;
}

const shortcutColumns = (() => {
  const column = dataTableColumns<ShortcutRow>();

  return column.columns([
    column.accessor((row) => row.shortcut.description, {
      id: "description",
      header: "Description",
    }),
    column.accessor((row) => row.shortcut.name, {
      id: "name",
      header: "Name",
      cell: ({ getValue }) =>
        html`<span class="mono xsmall">${getValue()}</span>`,
    }),
    column.accessor("keys", {
      header: "Keys",
      cell: ({ getValue }) =>
        html`<span class="mono xsmall">${getValue()}</span>`,
    }),
    column.display({
      id: "actions",
      header: "Action",
      cell: ({ row }) => {
        const { shortcut } = row.original;

        return html`<sb-action-button
          icon-only
          label=${shortcut.description || shortcut.name}
          .icon=${mdiPlay}
          .atom=${runGlobalShortcut(shortcut.name)}
        ></sb-action-button>`;
      },
    }),
  ]);
})();

const shortcutId = (row: ShortcutRow) => row.shortcut.name;

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

// Where the tables below start; they keep their own changes
const displayTableState = {
  filter: "",
  sort: "id",
  descending: false,
  page: 1,
  pageSize: undefined,
};

const inputTableState = {
  filter: "",
  sort: "type",
  descending: false,
  page: 1,
  pageSize: undefined,
};

const shortcutTableState = {
  filter: "",
  sort: "description",
  descending: false,
  page: 1,
  pageSize: undefined,
};

// Unsorted, so binds keep the config's order
const bindTableState = {
  filter: "",
  sort: undefined,
  descending: false,
  page: 1,
  pageSize: undefined,
};

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
      html`<sb-action-button
        icon-only
        quiet
        label="${verb} ${name.toLowerCase()}"
        .icon=${path}
        .atom=${hyprlandDispatchTowards(dispatcher)(direction)}
      ></sb-action-button>`,
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
  html`<sb-action-button
    quiet
    label=${label}
    .icon=${path}
    .atom=${hyprlandDispatch(dispatcher)}
  ></sb-action-button>`;

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

const omarchyMenuColumns = (() => {
  const column = dataTableColumns<OmarchyMenu>();

  return column.columns([
    column.accessor("name", { header: "Name" }),
    column.accessor("id", {
      header: "Route",
      cell: ({ getValue }) =>
        html`<span class="mono xsmall">${getValue()}</span>`,
    }),
    column.accessor((menu) => menu.aliases.join(", "), {
      id: "aliases",
      header: "Aliases",
      cell: ({ getValue }) =>
        html`<span class="mono xsmall">${getValue()}</span>`,
    }),
    column.display({
      id: "actions",
      header: "Action",
      cell: ({ row }) =>
        html`<sb-omarchy-actions
          kind="menu"
          .item=${row.original}
        ></sb-omarchy-actions>`,
    }),
  ]);
})();

const omarchyPanelColumns = (() => {
  const column = dataTableColumns<OmarchyPanel>();

  return column.columns([
    column.accessor("name", { header: "Name" }),
    column.accessor("id", {
      header: "ID",
      cell: ({ getValue }) =>
        html`<span class="mono xsmall">${getValue()}</span>`,
    }),
    column.display({
      id: "actions",
      header: "Action",
      cell: ({ row }) =>
        html`<sb-omarchy-actions
          kind="panel"
          .item=${row.original}
        ></sb-omarchy-actions>`,
    }),
  ]);
})();

/** How a function is called, such as `seek(seconds: int): void`. */
const omarchySignature = (fn: OmarchyFunction) =>
  `${fn.name}(${fn.arguments
    .map((argument) => `${argument.name}: ${argument.type}`)
    .join(", ")}): ${fn.returns}`;

const omarchyTargetColumns = (() => {
  const column = dataTableColumns<OmarchyTarget>();

  return column.columns([
    column.accessor("name", {
      header: "Target",
      cell: ({ getValue }) =>
        html`<span class="mono xsmall">${getValue()}</span>`,
    }),
    column.accessor(
      (target) => target.functions.map(omarchySignature).join(", "),
      {
        id: "functions",
        header: "Functions",
        cell: ({ getValue }) =>
          html`<span class="mono xsmall">${getValue()}</span>`,
      },
    ),
  ]);
})();

const omarchyId = (item: OmarchyMenu | OmarchyPanel | OmarchyTarget) =>
  "id" in item ? item.id : item.name;

const omarchyTableState = {
  filter: "",
  sort: "name",
  descending: false,
  page: 1,
  pageSize: undefined,
};

// By route, which groups them by where they sit in the menu
const omarchyMenuTableState = { ...omarchyTableState, sort: "id" };

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
    <header class="page-header">
      <span class="tile">${icon(section.icon)}</span>
      <div class="titles">
        <h2>${section.heading}</h2>
        <p class="description">${section.description}</p>
      </div>
      ${
        section.actions === undefined
          ? nothing
          : html`<div class="actions">${section.actions}</div>`
      }
    </header>
    <div class="dashboard">${section.cards}</div>
  </section>
`;

const omarchyCards = (omarchy: OmarchyData) => html`
  <gw-card heading="Menus" description="${omarchy.menus.length} routes">
    <sb-action-button
      slot="actions"
      quiet
      label="Close menu"
      .icon=${mdiClose}
      .atom=${closeOmarchyMenu}
    ></sb-action-button>
    <sb-data-table
      local
      label="Omarchy menus"
      search-placeholder="Search menus"
      .columns=${omarchyMenuColumns}
      .data=${omarchy.menus}
      .rowId=${omarchyId}
      .wide=${["aliases"]}
      .state=${omarchyMenuTableState}
    ></sb-data-table>
  </gw-card>
  <gw-card
    heading="Panels"
    description="${omarchy.panels.length} from enabled plugins"
  >
    <sb-data-table
      local
      label="Omarchy panels"
      search-placeholder="Search panels"
      .columns=${omarchyPanelColumns}
      .data=${omarchy.panels}
      .rowId=${omarchyId}
      .state=${omarchyTableState}
    ></sb-data-table>
  </gw-card>
  <gw-card heading="Shell IPC" description="${omarchy.targets.length} targets">
    <sb-data-table
      local
      label="Omarchy shell IPC targets"
      search-placeholder="Search targets"
      .columns=${omarchyTargetColumns}
      .data=${omarchy.targets}
      .rowId=${omarchyId}
      .wide=${["functions"]}
      .state=${omarchyTableState}
    ></sb-data-table>
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
      <sb-data-table
        local
        label="Displays"
        search-placeholder="Search displays"
        .columns=${displayColumns}
        .data=${displays}
        .rowId=${displayId}
        .numeric=${["scale"]}
        .wide=${["layers"]}
        .state=${displayTableState}
      ></sb-data-table>
    </gw-card>
    <gw-card heading="Global shortcuts" description="Registered by apps">
      <sb-data-table
        local
        label="Global shortcuts"
        search-placeholder="Search shortcuts"
        .columns=${shortcutColumns}
        .data=${shortcuts}
        .rowId=${shortcutId}
        .state=${shortcutTableState}
      ></sb-data-table>
    </gw-card>
    <gw-card heading="Input devices" description="${inputs.length} connected">
      <sb-data-table
        local
        label="Input devices"
        search-placeholder="Search input devices"
        .columns=${inputColumns}
        .data=${inputs}
        .rowId=${inputId}
        .wide=${["details", "name"]}
        .state=${inputTableState}
      ></sb-data-table>
    </gw-card>
    <gw-card
      heading="Key bindings"
      description="${hyprland.binds.length} in the config"
    >
      <sb-data-table
        local
        label="Key bindings"
        search-placeholder="Search key bindings"
        .columns=${bindColumns}
        .data=${hyprland.binds}
        .rowId=${bindId}
        .wide=${["action", "description"]}
        .state=${bindTableState}
      ></sb-data-table>
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

  const rows = desktop.windows.map((window): WindowRow => ({
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
                html`<sb-action-button
                  label=${layout}
                  .icon=${mdiKeyboardOutline}
                  .atom=${setKeyboardLayout(layout)}
                ></sb-action-button>`,
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
        <sb-data-table
          label="Windows"
          search-placeholder="Search windows"
          .columns=${windowColumns}
          .data=${rows}
          .rowId=${windowId}
          .numeric=${["pid"]}
          .wide=${["title"]}
          .state=${tableState(location.search, {
            sort: "app",
            descending: false,
          })}
          @table-state-change=${onTableChange(location)}
        ></sb-data-table>
      </gw-card>
      ${
        desktop.workspaces.length === 0
          ? nothing
          : html`<gw-card heading="Workspaces">
              <sb-data-table
                local
                label="Workspaces"
                search-placeholder="Search workspaces"
                .columns=${workspaceColumns}
                .data=${workspaces}
                .rowId=${workspaceId}
                .numeric=${["windows"]}
                .state=${workspaceTableState}
              ></sb-data-table>
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
            actions: html`<sb-action-button
              quiet
              label="Reload config"
              .icon=${mdiReload}
              .atom=${reloadHyprlandConfig}
            ></sb-action-button>`,
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
      <div class="empty">
        ${icon(mdiHeadset)}
        <p>Discord isn't set up yet.</p>
        <p class="muted small">
          Connect System Bridge to the Discord desktop app to see your voice
          settings and calls here.
        </p>
        <a
          class="button filled"
          href=${href("module", {
            params: { module: "discord" },
            hash: "discord-setup",
          })}
          >Set up Discord</a
        >
      </div>
    </gw-card>`;
  }

  const members = discord.call?.members.map(member) ?? [];

  return html`
    <div class="dashboard">
      <gw-card class="third" heading="Status">
        <div class="row wrap">
          <span class="chip ${discord.connected ? "success" : "danger"}"
            ><span class="dot"></span
            >${discord.connected ? "Connected" : "Not connected"}</span
          >
          <span class="chip ${discord.authenticated ? "success" : ""}"
            >${discord.authenticated ? "Signed in" : "Not signed in"}</span
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
