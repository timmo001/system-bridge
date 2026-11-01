import { mdiCodeJson, mdiViewDashboardOutline } from "@mdi/js";
import type { ModuleName } from "@timmo001/effect-system-bridge";
import { css, html, nothing, type TemplateResult } from "lit";
import { customElement, property } from "lit/decorators.js";

import "~/components/sb-audio-device";
import "~/components/sb-audio-main";
import "~/components/sb-camera-capture";
import "~/components/sb-camera-controls";
import "@timmo001/groundwork-ui/gw-card.ts";
import "~/components/sb-data-table";
import "~/components/sb-display-controls";
import "~/components/sb-history-export";
import "@timmo001/groundwork-ui/gw-gauge.ts";
import "@timmo001/groundwork-ui/gw-meter.ts";
import "@timmo001/groundwork-ui/gw-segmented.ts";
import type { Segment } from "@timmo001/groundwork-ui/gw-segmented.ts";
import "~/components/sb-timeseries";
import { pageStyles, shared } from "~/components/shared-styles";
import { AtomController } from "~/controllers/atom-controller";
import {
  audioDashboard,
  batteryDashboard,
  camerasDashboard,
  cpuDashboard,
  displaysDashboard,
  gpusDashboard,
  memoryDashboard,
  sensorsDashboard,
} from "~/dashboards/hardware";
import { type DashboardContext, dashboardStyles } from "~/dashboards/shared";
import {
  bluetoothDashboard,
  disksDashboard,
  networksDashboard,
} from "~/dashboards/storage-network";
import {
  desktopDashboard,
  discordDashboard,
  mediaDashboard,
  processesDashboard,
  systemDashboard,
} from "~/dashboards/system";
import { actionResult, moduleState } from "~/lib/atoms";
import { exportHistory, historyModules, metricHistory } from "~/lib/history";
import { moduleInfo } from "~/lib/navigation";
import { mediaPlayer } from "~/lib/preferences";
import {
  type DataView,
  href,
  type LocationOf,
  navigate,
  scrollToSection,
} from "~/lib/router";
import { selectValue } from "~/lib/select";

const viewOptions: readonly Segment[] = [
  { value: "dashboard", label: "Dashboard", icon: mdiViewDashboardOutline },
  { value: "json", label: "JSON", icon: mdiCodeJson },
];

import "./page-discord";
import "./page-media";
import "./page-notifications";
import "./page-open";
import "./page-settings-cameras";
import "./page-settings-commands";
import "./page-settings-desktop";
import "./page-settings-discord";
import "./page-settings-disks";
import "./page-settings-media";
import { SbPage } from "./sb-page";

const dashboards: Readonly<
  Record<ModuleName, (context: DashboardContext) => TemplateResult>
> = {
  audio: audioDashboard,
  battery: batteryDashboard,
  bluetooth: bluetoothDashboard,
  cameras: camerasDashboard,
  cpu: cpuDashboard,
  desktop: desktopDashboard,
  discord: discordDashboard,
  disks: disksDashboard,
  displays: displaysDashboard,
  gpus: gpusDashboard,
  media: mediaDashboard,
  memory: memoryDashboard,
  networks: networksDashboard,
  processes: processesDashboard,
  sensors: sensorsDashboard,
  system: systemDashboard,
};

/**
 * The modules whose history each page graphs, ticked to start in its Export
 * menu. Most graph only their own; the System page's power graph also shows
 * the CPU's and GPUs'. Made once, so a re-render keeps the user's ticks.
 */
const shownHistory: ReadonlyMap<ModuleName, readonly ModuleName[]> = new Map(
  [...historyModules].map((module) => [
    module,
    module === "system" ? ["system", "cpu", "gpus"] : [module],
  ]),
);

/**
 * The controls and settings that belong with a module's data, each with an
 * id so a link can go straight to it. `before` sits above the data, the rest
 * under it.
 */
const sections: Partial<
  Record<
    ModuleName,
    {
      readonly before?: TemplateResult;
      readonly after?: TemplateResult;
    }
  >
> = {
  system: {
    after: html`
      <page-settings-commands
        embedded
        id="commands"
        class="wide"
      ></page-settings-commands>
      <page-notifications embedded id="notifications"></page-notifications>
      <page-open embedded id="open"></page-open>
    `,
  },
  desktop: {
    after: html`<page-settings-desktop
      embedded
      id="window-titles"
      class="wide"
    ></page-settings-desktop>`,
  },
  cameras: {
    after: html`<page-settings-cameras
      embedded
      id="camera-capture"
      class="wide"
    ></page-settings-cameras>`,
  },
  disks: {
    after: html`<page-settings-disks
      embedded
      id="disk-mounts"
      class="wide"
    ></page-settings-disks>`,
  },
  media: {
    before: html`<page-media
      embedded
      id="media-controls"
      class="wide"
    ></page-media>`,
    after: html`<page-settings-media
      embedded
      id="media-directories"
      class="wide"
    ></page-settings-media>`,
  },
  discord: {
    after: html`
      <page-discord embedded id="discord-controls" class="wide"></page-discord>
      <page-settings-discord
        embedded
        id="discord-setup"
        class="wide"
      ></page-settings-discord>
    `,
  },
};

/** Placeholders the size of a typical dashboard, so loading doesn't jump. */
const placeholder = html`
  <div class="dashboard" aria-busy="true" aria-label="Loading">
    <gw-skeleton class="placeholder third"></gw-skeleton>
    <gw-skeleton class="placeholder two-thirds"></gw-skeleton>
    <gw-skeleton class="placeholder half"></gw-skeleton>
    <gw-skeleton class="placeholder half"></gw-skeleton>
  </div>
`;

/**
 * One module's data, as a dashboard or as JSON. The module is in the path and
 * the view in the search, so a reload or a shared link shows the same thing.
 */
@customElement("page-module")
export class PageModule extends SbPage {
  static override styles = [
    shared,
    pageStyles,
    dashboardStyles,
    css`
      .sections {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(min(100%, 28rem), 1fr));
        gap: var(--gw-space-6);
        align-items: start;
      }

      .sections > .wide {
        grid-column: 1 / -1;
      }

      /* Clear of the sticky header when a link scrolls to one */
      [embedded] {
        scroll-margin-top: calc(var(--sb-header-height) + var(--gw-space-4));
      }

      /* The JSON view loads when first shown; hold its space until then */
      sb-json-view:not(:defined) {
        display: block;
        height: var(--sb-json-height, 36rem);
        border: 1px solid var(--gw-color-border-normal);
        border-radius: var(--gw-radius-l);
      }
    `,
  ];

  @property({ attribute: false }) location!: LocationOf<"module">;

  readonly #modules = new AtomController(this, () => moduleState);

  readonly #history = new AtomController(this, () => metricHistory);

  readonly #export = new AtomController(this, () => exportHistory);

  readonly #mediaPlayer = new AtomController(this, () => mediaPlayer);

  protected get pageTitle(): string {
    return moduleInfo[this.location.params.module].label;
  }

  #viewHref(view: DataView) {
    return href("module", {
      params: this.location.params,
      search: {
        ...this.location.search,
        view: view === "dashboard" ? undefined : view,
      },
    });
  }

  #onViewChange = (event: Event) => {
    const view = selectValue(event);

    if (view === "dashboard" || view === "json") {
      navigate(this.#viewHref(view));
    }
  };

  #renderContent(module: ModuleName, view: DataView) {
    const { data, settled } = this.#modules.value;

    // Wait for this module only, so a slow one elsewhere doesn't hold it up
    if (!settled.has(module)) return placeholder;

    // The editor behind the JSON view is large, so it loads only when needed
    if (view === "json") void import("~/components/sb-json-view");

    if (view === "json") {
      return html`<sb-json-view
        label="${moduleInfo[module].label} data as JSON"
        .data=${data[module] ?? null}
      ></sb-json-view>`;
    }

    const extra = sections[module];

    return html`
      ${extra?.before ?? nothing}
      ${dashboards[module]({
        data,
        history: this.#history.value,
        location: this.location,
        mediaPlayer: this.#mediaPlayer.value,
      })}
      ${
        extra?.after === undefined
          ? nothing
          : html`<div class="sections">${extra.after}</div>`
      }
    `;
  }

  /** The section the URL's hash last scrolled to, on this path. */
  #scrolledTo: string | undefined;

  /**
   * Scrolls to the section the hash names, once it's there. The sections are
   * in this shadow root, where the browser's own jump to a hash can't reach.
   */
  protected override updated(): void {
    super.updated();

    const id = window.location.hash.slice(1);
    const key = `${window.location.pathname}#${id}`;

    if (id === "" || this.#scrolledTo === key) return;

    const target = this.renderRoot.querySelector(`#${CSS.escape(id)}`);

    if (target === null) return;

    this.#scrolledTo = key;
    scrollToSection(target);
  }

  override render() {
    const module = this.location.params.module;
    const view = this.location.search.view ?? "dashboard";
    const info = moduleInfo[module];

    return html`
      <div class="page">
        ${this.renderHeader({
          heading: info.label,
          description: info.description,
          icon: info.icon,
          actions: html`${
              shownHistory.has(module) && this.status.isConnected
                ? html`<sb-history-export
                    .modules=${shownHistory.get(module)}
                  ></sb-history-export>`
                : nothing
            }<gw-segmented
              labels="auto"
              size="small"
              label="View"
              .options=${viewOptions}
              .value=${view}
              @change=${this.#onViewChange}
            ></gw-segmented>`,
        })}
        ${
          // Only a failed export needs a message; the download is the success
          this.#export.value._tag === "Failure"
            ? this.renderResult(actionResult(this.#export.value, ""))
            : nothing
        }
        ${this.gate(() => this.#renderContent(module, view), placeholder)}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "page-module": PageModule;
  }
}
