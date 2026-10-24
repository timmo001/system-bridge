import { mdiCodeJson, mdiViewDashboardOutline } from "@mdi/js";
import type { ModuleName } from "@timmo001/effect-system-bridge";
import { css, html, type TemplateResult } from "lit";
import { customElement, property } from "lit/decorators.js";

import "~/components/sb-card";
import "~/components/sb-data-table";
import "~/components/sb-gauge";
import "~/components/sb-meter";
import "~/components/sb-segmented";
import "~/components/sb-timeseries";
import { pageStyles, shared } from "~/components/shared-styles";
import { AtomController } from "~/controllers/atom-controller";
import {
  batteryDashboard,
  cpuDashboard,
  displaysDashboard,
  gpusDashboard,
  memoryDashboard,
  sensorsDashboard,
} from "~/dashboards/hardware";
import { type DashboardContext, dashboardStyles } from "~/dashboards/shared";
import {
  disksDashboard,
  networksDashboard,
} from "~/dashboards/storage-network";
import {
  discordDashboard,
  mediaDashboard,
  processesDashboard,
  systemDashboard,
} from "~/dashboards/system";
import { moduleState } from "~/lib/atoms";
import { metricHistory } from "~/lib/history";
import { moduleInfo } from "~/lib/navigation";
import { type DataView, href, type LocationOf } from "~/lib/router";

import { SbPage } from "./sb-page";

const dashboards: Readonly<
  Record<ModuleName, (context: DashboardContext) => TemplateResult>
> = {
  battery: batteryDashboard,
  cpu: cpuDashboard,
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

/** Placeholders the size of a typical dashboard, so loading doesn't jump. */
const placeholder = html`
  <div class="dashboard" aria-busy="true" aria-label="Loading">
    <span class="skeleton placeholder third"></span>
    <span class="skeleton placeholder two-thirds"></span>
    <span class="skeleton placeholder half"></span>
    <span class="skeleton placeholder half"></span>
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
      /* The JSON view loads when first shown; hold its space until then */
      sb-json-view:not(:defined) {
        display: block;
        height: var(--sb-json-height, 36rem);
        border: 1px solid var(--sb-color-border);
        border-radius: var(--sb-radius-l);
      }
    `,
  ];

  @property({ attribute: false }) location!: LocationOf<"module">;

  readonly #modules = new AtomController(this, () => moduleState);

  readonly #history = new AtomController(this, () => metricHistory);

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

  #renderContent(module: ModuleName, view: DataView) {
    const { data, settled } = this.#modules.value;

    // Wait for this module only, so a slow one elsewhere doesn't hold it up
    if (!settled.has(module)) return placeholder;

    // The editor behind the JSON view is large, so it loads only when needed
    if (view === "json") void import("~/components/sb-json-view");

    return view === "json"
      ? html`<sb-json-view
          label="${moduleInfo[module].label} data as JSON"
          .data=${data[module] ?? null}
        ></sb-json-view>`
      : dashboards[module]({
          data,
          history: this.#history.value,
          location: this.location,
        });
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
          actions: html`<sb-segmented
            narrow-icons
            label="View"
            .options=${[
              {
                value: "dashboard",
                label: "Dashboard",
                icon: mdiViewDashboardOutline,
                href: this.#viewHref("dashboard"),
              },
              {
                value: "json",
                label: "JSON",
                icon: mdiCodeJson,
                href: this.#viewHref("json"),
              },
            ]}
            .value=${view}
          ></sb-segmented>`,
        })}
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
