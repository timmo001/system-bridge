import { mdiListStatus } from "@mdi/js";
import type {
  ServiceError,
  ServiceHealth,
  ServiceItem,
  ServiceList,
  ServiceListItem,
  ServiceProvider,
  ServiceStat,
} from "@timmo001/effect-system-bridge";
import type { TableColumn } from "@timmo001/groundwork-ui/gw-table.ts";
import { Option, Schema } from "effect";
import { html, nothing } from "lit";

import "~/components/sb-service-actions";
import "~/components/sb-table";
import {
  formatAgo,
  formatBytes,
  formatCount,
  formatDateTime,
  formatUptime,
} from "~/lib/format";
import { type DashboardContext, facts, stat } from "./shared";

/** The docs page on setting up a services provider. */
const PROVIDERS_DOCS_URL = "https://system-bridge.timmo.dev/features/services/";

type Tone = "danger" | "warning" | "accent" | "neutral" | "success";

/** Each health's chip, worst first. */
export const healthTone: Readonly<Record<ServiceHealth, Tone>> = {
  failed: "danger",
  missing: "danger",
  inactive: "warning",
  stale: "warning",
  degraded: "warning",
  warning: "warning",
  running: "accent",
  paused: "neutral",
  ok: "success",
};

const healthLabel: Readonly<Record<ServiceHealth, string>> = {
  failed: "Failed",
  missing: "Missing",
  inactive: "Inactive",
  stale: "Stale",
  degraded: "Degraded",
  warning: "Warning",
  running: "Running",
  paused: "Paused",
  ok: "OK",
};

/** A stat's value is a number or a short string, as the provider sent it. */
const StatValue = Schema.Union([Schema.Finite, Schema.String]);
const decodeStatValue = Schema.decodeUnknownOption(StatValue);
const isNumber = Schema.is(Schema.Finite);

const healthChip = (health: ServiceHealth) =>
  html`<gw-chip size="small" tone=${healthTone[health]}
    ><gw-dot slot="icon" tone=${healthTone[health]}></gw-dot
    >${healthLabel[health]}</gw-chip
  >`;

/** A time as how long ago or until it is, with the date and time on hover. */
const when = (millis: number | null) =>
  millis === null
    ? null
    : html`<span title=${formatDateTime(millis)}>${formatAgo(millis)}</span>`;

/** A number formatted by the kind the provider gave it. */
const formatKind = (value: number, item: ServiceStat): string | undefined => {
  switch (item.kind) {
    case "duration":
      return formatUptime(value);
    case "size":
      // Bytes, unless the provider gave a unit of its own
      return item.unit === null ? formatBytes(value) : undefined;
    case "timestamp":
      return formatAgo(value);
    case "count":
      return formatCount(value);
    case null:
      return undefined;
  }
};

/** A stat's value, formatted by its kind where it has one. */
const statValue = (item: ServiceStat): string =>
  Option.match(decodeStatValue(item.value), {
    onNone: () => "",
    onSome: (value) =>
      (isNumber(value) ? formatKind(value, item) : undefined) ??
      (item.unit === null ? `${value}` : `${value} ${item.unit}`),
  });

const listColumns: readonly TableColumn<ServiceListItem>[] = [
  { id: "label", header: "Name", wide: true },
  { id: "value", header: "Value" },
];

// In the order the provider sent the rows until someone sorts them
const listSection = (item: ServiceItem, list: ServiceList) => {
  const heading = list.label || list.id;

  return html`<h3 class="small">${heading}</h3>
    <sb-table
      label="${item.label} ${heading}"
      search-label="Search ${heading.toLowerCase()}"
      .columns=${listColumns}
      .rows=${list.items}
    ></sb-table>`;
};

const itemCard = (item: ServiceItem) => {
  const stats = item.stats.map((s) => stat(s.label || s.id, statValue(s)));
  const notes = item.notes.map((note) => html`<li>${note}</li>`);
  const lists = item.lists.map((list) => listSection(item, list));

  return html`<gw-card
    class="half"
    heading=${item.label}
    description=${[item.kind, item.provider].filter(Boolean).join(" · ")}
  >
    <div class="row wrap">
      ${healthChip(item.health)}
      ${item.busy ? html`<gw-chip size="small" tone="accent">Busy</gw-chip>` : nothing}
    </div>
    ${item.summary === null || item.summary === "" ? nothing : html`<p>${item.summary}</p>`}
    ${
      item.progress === null
        ? nothing
        : html`<gw-meter
            label="Progress"
            .value=${Math.round(item.progress * 100)}
          ></gw-meter>`
    }
    ${stats.length === 0 ? nothing : html`<div class="stats">${stats}</div>`}
    ${facts([
      ["Last run", when(item.last_run)],
      ["Last success", when(item.last_success)],
      ["Next run", when(item.next_run)],
    ])}
    ${
      notes.length === 0
        ? nothing
        : html`<ul class="list">
            ${notes}
          </ul>`
    }
    ${lists}
    <sb-service-actions .item=${item}></sb-service-actions>
  </gw-card>`;
};

const providerAlert = (provider: ServiceProvider) =>
  html`<gw-alert
    tone="danger"
    urgent
    heading="Couldn't read the ${provider.id} provider"
  >
    ${provider.error}
    ${
      provider.updated === null
        ? nothing
        : html`<p class="small">
            Showing what it reported ${formatAgo(provider.updated)}, marked
            stale.
          </p>`
    }
  </gw-alert>`;

const problem = (error: ServiceError) =>
  html`<li>
    <span
      ><strong>${error.source}</strong> (${error.provider}):
      ${error.message}</span
    >
  </li>`;

/** The services, timers and checks the providers report. */
export const servicesDashboard = ({ data }: DashboardContext) => {
  const services = data.services;

  if (services === undefined || services.providers.length === 0) {
    return html`<gw-card>
      <gw-empty-state icon=${mdiListStatus} heading="No services provider yet">
        <p>
          Add a provider to the settings file to see this computer's services,
          timers, backups and other checks here.
        </p>
        <gw-button slot="actions" href=${PROVIDERS_DOCS_URL} target="_blank"
          >Set up a provider</gw-button
        >
      </gw-empty-state>
    </gw-card>`;
  }

  const alerts = services.providers
    .filter((provider) => provider.error !== null)
    .map(providerAlert);

  const items = services.items.map(itemCard);
  const problems = services.errors.map(problem);

  return html`
    <div class="dashboard">
      ${alerts}
      ${
        items.length === 0
          ? html`<gw-card>
              <gw-empty-state
                ><p>The providers report no items.</p></gw-empty-state
              >
            </gw-card>`
          : items
      }
      ${
        problems.length === 0
          ? nothing
          : html`<gw-card heading="Problems the providers reported">
              <ul class="list">
                ${problems}
              </ul>
            </gw-card>`
      }
    </div>
  `;
};
