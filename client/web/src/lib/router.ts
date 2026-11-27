import { ModuleName } from "@timmo001/effect-system-bridge";
import { Schema } from "effect";

import {
  type LocationOf as RouterLocationOf,
  type Location as RouterLocation,
  makeRouter,
  NoParams,
  NoSearch,
  type ParamsOf as RouterParamsOf,
  route,
  type SearchOf as RouterSearchOf,
} from "~/lit-effect/router";

/** How a module page shows its data. */
export const DataView = Schema.Literals(["dashboard", "json"]);

export type DataView = typeof DataView.Type;

export const SortOrder = Schema.Literals(["asc", "desc"]);

export type SortOrder = typeof SortOrder.Type;

/** A module page: its view, and the sort and search of any table it shows. */
export const ModuleSearch = Schema.Struct({
  view: Schema.optional(DataView),
  /** Filters a table's rows. */
  q: Schema.optional(Schema.String),
  /** The column a table is sorted by. */
  sort: Schema.optional(Schema.String),
  order: Schema.optional(SortOrder),
});

export interface ModuleSearch extends Schema.Schema.Type<typeof ModuleSearch> {}

export const routes = {
  overview: route("/", NoParams, NoSearch),
  // Only module names match, so the other routes' paths are free
  module: route(
    "/:module",
    Schema.Struct({ module: ModuleName }),
    ModuleSearch,
  ),
  connection: route("/connection", NoParams, NoSearch),
  remote: route("/remote", NoParams, NoSearch),
  whatsNew: route("/whats-new", NoParams, NoSearch),
  settings: route("/settings", NoParams, NoSearch),
  settingsAppearance: route("/settings/appearance", NoParams, NoSearch),
  settingsDevices: route("/settings/devices", NoParams, NoSearch),
} as const;

type Routes = typeof routes;

export type RouteName = keyof Routes;

export type ParamsOf<K extends RouteName> = RouterParamsOf<Routes, K>;

export type SearchOf<K extends RouteName> = RouterSearchOf<Routes, K>;

/** A route the URL points at, with its decoded params and search. */
export type LocationOf<K extends RouteName> = RouterLocationOf<Routes, K>;

/** The page the URL points at. */
export type Location = RouterLocation<Routes>;

/**
 * Pages that became sections of a module's page, by their old path, so old
 * links and bookmarks still land in the right place.
 */
interface MovedPage {
  readonly module: ModuleName;
  /** The section's id on the module's page. */
  readonly section: string;
}

const moved = new Map<string, MovedPage>([
  ["/actions/media", { module: "media", section: "media-controls" }],
  ["/actions/notifications", { module: "system", section: "notifications" }],
  ["/actions/open", { module: "system", section: "open" }],
  ["/settings/commands", { module: "system", section: "commands" }],
  ["/settings/media", { module: "media", section: "media-directories" }],
  ["/settings/disks", { module: "disks", section: "disk-mounts" }],
  ["/settings/discord", { module: "discord", section: "discord-setup" }],
]);

/**
 * Where the UI lives, from Vite's `base`: empty at the root, or a prefix such
 * as a reverse proxy's path. Every route is relative to it. This can't come
 * from `document.baseURI`, which without a `<base>` is the current page.
 */
const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

/**
 * Where an old address lives now, if it moved: a module's page under
 * `/data/`, or a page that became a section of one.
 */
const movedTo = (url: URL): string | undefined => {
  const path = url.pathname.startsWith(basePath)
    ? url.pathname.slice(basePath.length)
    : url.pathname;

  const parts = path.split("/").filter((part) => part !== "");

  if (parts.length === 2 && parts[0] === "data") {
    return `${basePath}/${parts[1] ?? ""}${url.search}${url.hash}`;
  }

  const target = moved.get(`/${parts.join("/")}`);

  return target === undefined
    ? undefined
    : `${basePath}/${target.module}#${target.section}`;
};

export const {
  href,
  navigate,
  currentLocation,
  updateSearch,
  scrollToSection,
} = makeRouter(routes, {
  basePath,
  // Kept from before the shared router, so saved positions still restore
  scrollKey: "system-bridge-scroll",
  redirect: movedTo,
});
