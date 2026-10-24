import { mdiCodeJson, mdiViewDashboardOutline } from "@mdi/js";
import type { ModuleName } from "@timmo001/effect-system-bridge";
import { css, html, nothing, type TemplateResult } from "lit";
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
import {
  type DataView,
  href,
  type LocationOf,
  scrollToSection,
} from "~/lib/router";

import "./page-discord";
import "./page-media";
import "./page-notifications";
import "./page-open";
import "./page-settings-commands";
import "./page-settings-discord";
import "./page-settings-disks";
import "./page-settings-media";
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
    before: html`<page-discord
      embedded
      id="discord-controls"
      class="wide"
    ></page-discord>`,
    after: html`<page-settings-discord
      embedded
      id="discord-setup"
      class="wide"
    ></page-settings-discord>`,
  },
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
      .sections {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(min(100%, 28rem), 1fr));
        gap: var(--sb-space-6);
        align-items: start;
      }

      .sections > .wide {
        grid-column: 1 / -1;
      }

      /* Clear of the sticky header when a link scrolls to one */
      [embedded] {
        scroll-margin-top: calc(var(--sb-header-height) + var(--sb-space-4));
      }

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
