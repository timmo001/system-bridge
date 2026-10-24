import { ModuleName } from "@timmo001/effect-system-bridge";
import { Option, Schema } from "effect";
import { Atom } from "effect/reactivity";

/** What a route's search params encode to: optional strings by name. */
type SearchEncoded = Readonly<Record<string, string | undefined>>;

/** What a route's path params encode to: one string per `:name` segment. */
type ParamsEncoded = Readonly<Record<string, string>>;

interface RouteDefinition<P, S> {
  /** The path, with `:name` segments for params, such as `/data/:module`. */
  readonly path: string;
  readonly params: Schema.Codec<P, ParamsEncoded>;
  /** Every key must be optional, so a URL without them still matches. */
  readonly search: Schema.Codec<S, SearchEncoded>;
}

const NoParams = Schema.Struct({});

const NoSearch = Schema.Struct({});

const route = <P, S>(
  path: string,
  params: Schema.Codec<P, ParamsEncoded>,
  search: Schema.Codec<S, SearchEncoded>,
): RouteDefinition<P, S> => ({ path, params, search });

/** How a module page shows its data. */
export const DataView = Schema.Literals(["dashboard", "json"]);

export type DataView = typeof DataView.Type;

export const SortOrder = Schema.Literals(["asc", "desc"]);

export type SortOrder = typeof SortOrder.Type;

const PageNumber = Schema.NumberFromString.check(
  Schema.isInt(),
  Schema.isGreaterThanOrEqualTo(1),
);

/** A module page: its view, and the state of any table it shows. */
export const ModuleSearch = Schema.Struct({
  view: Schema.optional(DataView),
  /** Filters a table's rows. */
  q: Schema.optional(Schema.String),
  /** The column a table is sorted by. */
  sort: Schema.optional(Schema.String),
  order: Schema.optional(SortOrder),
  page: Schema.optional(PageNumber),
  size: Schema.optional(PageNumber),
});

export interface ModuleSearch extends Schema.Schema.Type<typeof ModuleSearch> {}

export const OpenTargetType = Schema.Literals(["url", "path"]);

export type OpenTargetType = typeof OpenTargetType.Type;

export const routes = {
  overview: route("/", NoParams, NoSearch),
  module: route(
    "/data/:module",
    Schema.Struct({ module: ModuleName }),
    ModuleSearch,
  ),
  connection: route("/connection", NoParams, NoSearch),
  media: route("/actions/media", NoParams, NoSearch),
  notifications: route("/actions/notifications", NoParams, NoSearch),
  open: route(
    "/actions/open",
    NoParams,
    Schema.Struct({ type: Schema.optional(OpenTargetType) }),
  ),
  settings: route("/settings", NoParams, NoSearch),
  settingsAppearance: route("/settings/appearance", NoParams, NoSearch),
  settingsCommands: route("/settings/commands", NoParams, NoSearch),
  settingsDisks: route("/settings/disks", NoParams, NoSearch),
  settingsMedia: route("/settings/media", NoParams, NoSearch),
} as const;

type Routes = typeof routes;

export type RouteName = keyof Routes;

export type ParamsOf<K extends RouteName> =
  Routes[K] extends RouteDefinition<infer P, infer _> ? P : never;

export type SearchOf<K extends RouteName> =
  Routes[K] extends RouteDefinition<infer _, infer S> ? S : never;

/** A route the URL points at, with its decoded params and search. */
export interface LocationOf<K extends RouteName> {
  readonly name: K;
  readonly params: ParamsOf<K>;
  readonly search: SearchOf<K>;
}

/** The page the URL points at. */
export type Location =
  | { readonly [K in RouteName]: LocationOf<K> }[RouteName]
  | { readonly name: "notFound"; readonly path: string };

/**
 * A route's definition, typed by its name. `routes` maps every name to the
 * definition with those params and search, which TypeScript can't follow
 * through a generic index.
 */
const definitionOf = <K extends RouteName>(
  name: K,
): RouteDefinition<ParamsOf<K>, SearchOf<K>> =>
  // oxlint-disable-next-line timmo/prefer-types-over-assertions -- ParamsOf and SearchOf are read from this same entry
  routes[name] as RouteDefinition<ParamsOf<K>, SearchOf<K>>;

/**
 * Where the UI lives, from Vite's `base`: empty at the root, or a prefix such
 * as a reverse proxy's path. Every route is relative to it. This can't come
 * from `document.baseURI`, which without a `<base>` is the current page.
 */
const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

const segments = (path: string) => path.split("/").filter((s) => s !== "");

const compiled = Object.entries(routes).map(([name, definition]) => ({
  name,
  definition,
  segments: segments(definition.path),
}));

const matchParams = (
  pattern: readonly string[],
  path: readonly string[],
): Record<string, string> | undefined => {
  if (pattern.length !== path.length) return undefined;

  const params: Record<string, string> = {};

  for (const [index, part] of pattern.entries()) {
    const actual = path[index] ?? "";

    if (part.startsWith(":")) {
      params[part.slice(1)] = decodeURIComponent(actual);
    } else if (part !== actual) {
      return undefined;
    }
  }

  return params;
};

/**
 * Decodes search params, dropping the ones that don't decode, so a bad value
 * in a shared link falls back to its default rather than a missing page.
 */
const decodeSearch = <S>(
  schema: Schema.Codec<S, SearchEncoded>,
  params: URLSearchParams,
): S => {
  const decode = Schema.decodeUnknownOption(schema);
  const entries = Object.fromEntries(params);

  return Option.getOrElse(decode(entries), () => {
    const kept: Record<string, string> = {};

    for (const [key, value] of Object.entries(entries)) {
      if (Option.isSome(decode({ ...kept, [key]: value }))) kept[key] = value;
    }

    return Schema.decodeUnknownSync(schema)(kept);
  });
};

const parse = (url: URL): Location => {
  const path = url.pathname.startsWith(basePath)
    ? url.pathname.slice(basePath.length)
    : url.pathname;

  const parts = segments(path);

  for (const { name, definition, segments: pattern } of compiled) {
    const raw = matchParams(pattern, parts);

    if (raw === undefined) continue;

    const params = Schema.decodeUnknownOption(definition.params)(raw);

    if (Option.isNone(params)) continue;

    // oxlint-disable-next-line timmo/prefer-types-over-assertions -- the name and both schemas come from the same entry of `routes`
    return {
      name,
      params: params.value,
      search: decodeSearch(definition.search, url.searchParams),
    } as Location;
  }

  return { name: "notFound", path };
};

type HrefOptions<K extends RouteName> = {
  readonly search?: SearchOf<K>;
  readonly hash?: string;
} & (keyof ParamsOf<K> extends never
  ? { readonly params?: ParamsOf<K> }
  : { readonly params: ParamsOf<K> });

type HrefArgs<K extends RouteName> = keyof ParamsOf<K> extends never
  ? [options?: HrefOptions<K>]
  : [options: HrefOptions<K>];

const buildHref = <P, S>(
  definition: RouteDefinition<P, S>,
  params: P | undefined,
  search: S | undefined,
  hash: string | undefined,
): string => {
  const encodedParams =
    params === undefined ? {} : Schema.encodeSync(definition.params)(params);

  const path = segments(definition.path)
    .map((part) =>
      part.startsWith(":")
        ? encodeURIComponent(encodedParams[part.slice(1)] ?? "")
        : part,
    )
    .join("/");

  const query = new URLSearchParams();

  if (search !== undefined) {
    for (const [key, value] of Object.entries(
      Schema.encodeSync(definition.search)(search),
    )) {
      if (value !== undefined && value !== "") query.set(key, value);
    }
  }

  return `${basePath}/${path}${query.size > 0 ? `?${query.toString()}` : ""}${hash ? `#${hash}` : ""}`;
};

/** A link to a route, with its params and search encoded. */
export const href = <K extends RouteName>(
  name: K,
  ...[options]: HrefArgs<K>
): string => {
  return buildHref(
    definitionOf(name),
    options?.params,
    options?.search,
    options?.hash,
  );
};

/** The link within the UI that a click lands on, if any. */
const appLink = (event: MouseEvent) => {
  if (
    event.defaultPrevented ||
    event.button !== 0 ||
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.altKey
  ) {
    return undefined;
  }

  const link = event
    .composedPath()
    .find((target) => target instanceof HTMLAnchorElement);

  if (
    link?.target !== "" ||
    link.hasAttribute("download") ||
    link.origin !== location.origin ||
    !link.pathname.startsWith(basePath)
  ) {
    return undefined;
  }

  return link;
};

const navigationEvent = "sb-navigate";

/**
 * Goes to a URL within the UI without reloading. A new path scrolls to the
 * top; changing only the search, such as a table's page, keeps the scroll
 * position so the page doesn't jump.
 */
export const navigate = (
  url: string,
  options?: { readonly replace?: boolean },
): void => {
  const next = new URL(url, location.href);

  if (next.href === location.href) return;

  const samePath = next.pathname === location.pathname;

  rememberScroll();

  if (options?.replace) {
    history.replaceState(null, "", next.href);
  } else {
    history.pushState(null, "", next.href);
  }

  if (!samePath) window.scrollTo(0, 0);

  window.dispatchEvent(new Event(navigationEvent));
};

const scrollStorageKey = "system-bridge-scroll";

const ScrollPositions = Schema.fromJsonString(
  Schema.Record(Schema.String, Schema.Finite),
);

const decodeScrollPositions = Schema.decodeUnknownOption(ScrollPositions);

/** Where each URL was scrolled to this session, for reloads and going back. */
const scrollPositions = (): Record<string, number> => {
  try {
    return Option.getOrElse(
      decodeScrollPositions(sessionStorage.getItem(scrollStorageKey)),
      () => ({}),
    );
  } catch {
    return {};
  }
};

const rememberScroll = () => {
  try {
    sessionStorage.setItem(
      scrollStorageKey,
      JSON.stringify({ ...scrollPositions(), [location.href]: window.scrollY }),
    );
  } catch {
    // Storage can be unavailable, such as in a private window
  }
};

/** Stops restoring a scroll position, such as once someone scrolls. */
let cancelRestore: (() => void) | undefined;

/**
 * Scrolls back to where this URL was. The page grows as its data arrives, so
 * this waits until it's tall enough, rather than letting the browser try
 * once while the page is still short and land at the top.
 */
const restoreScroll = () => {
  cancelRestore?.();

  const target = scrollPositions()[location.href] ?? 0;

  if (target <= 0) {
    window.scrollTo(0, 0);

    return;
  }

  const root = document.documentElement;

  const attempt = () => {
    if (root.scrollHeight - window.innerHeight >= target) {
      window.scrollTo(0, target);
      stop();
    }
  };

  const observer = new ResizeObserver(attempt);
  const timer = setTimeout(() => stop(), 5000);

  const stop = () => {
    observer.disconnect();
    clearTimeout(timer);

    for (const type of ["wheel", "touchstart", "keydown"]) {
      window.removeEventListener(type, stop);
    }

    cancelRestore = undefined;
  };

  for (const type of ["wheel", "touchstart", "keydown"]) {
    window.addEventListener(type, stop, { once: true, passive: true });
  }

  cancelRestore = stop;

  // Start after the new page has rendered, so the old one's height can't
  // satisfy the check and then shrink away under it
  requestAnimationFrame(() =>
    requestAnimationFrame(() => {
      if (cancelRestore !== stop) return;

      observer.observe(document.body);
      attempt();
    }),
  );
};

/**
 * The page to show, from the URL. Links within the UI change it without a
 * reload, and the back and forward buttons follow it, as do scroll positions.
 */
export const currentLocation = Atom.readable((get) => {
  const update = () => get.setSelf(parse(new URL(location.href)));

  const onPopState = () => {
    update();
    restoreScroll();
  };

  history.scrollRestoration = "manual";
  window.addEventListener("pagehide", rememberScroll);
  restoreScroll();

  const onClick = (event: MouseEvent) => {
    const link = appLink(event);

    if (link === undefined) return;

    event.preventDefault();
    navigate(link.href);
  };

  window.addEventListener("popstate", onPopState);
  window.addEventListener(navigationEvent, update);
  document.addEventListener("click", onClick);
  get.addFinalizer(() => {
    window.removeEventListener("popstate", onPopState);
    window.removeEventListener("pagehide", rememberScroll);
    window.removeEventListener(navigationEvent, update);
    document.removeEventListener("click", onClick);
  });

  return parse(new URL(location.href));
}).pipe(Atom.keepAlive);

/**
 * Replaces some of the current route's search params, keeping the rest.
 * `undefined` removes one, so it falls back to its default.
 */
export const updateSearch = <K extends RouteName>(
  current: LocationOf<K>,
  changes: SearchOf<K>,
  options?: { readonly replace?: boolean },
): void => {
  navigate(
    buildHref(
      definitionOf(current.name),
      current.params,
      // Spread can't take a generic search type, so merge with assign
      Object.assign({}, current.search, changes),
      undefined,
    ),
    options,
  );
};
