/**
 * A typed router: routes declare their path params and search as Schemas,
 * and the current route is an atom.
 *
 * @module
 */
import { Option, Schema } from "effect";
import { Atom } from "effect/reactivity";

/** What a route's search params encode to: optional strings by name. */
export type SearchEncoded = { readonly [key: string]: string | undefined };

/** What a route's path params encode to: one string per `:name` segment. */
export type ParamsEncoded = { readonly [key: string]: string };

export interface RouteDefinition<P, S> {
  /** The path, with `:name` segments for params, such as `/issues/:id`. */
  readonly path: string;
  readonly params: Schema.Codec<P, ParamsEncoded>;
  /** Every key must be optional, so a URL without them still matches. */
  readonly search: Schema.Codec<S, SearchEncoded>;
}

export const NoParams = Schema.Struct({});

export const NoSearch = Schema.Struct({});

export const route = <P, S>(
  path: string,
  params: Schema.Codec<P, ParamsEncoded>,
  search: Schema.Codec<S, SearchEncoded>,
): RouteDefinition<P, S> => ({ path, params, search });

// oxlint-disable-next-line typescript/no-explicit-any -- each route keeps its own param and search types
type AnyRoutes = { readonly [name: string]: RouteDefinition<any, any> };

export type ParamsOf<R extends AnyRoutes, K extends keyof R> =
  R[K] extends RouteDefinition<infer P, infer _> ? P : never;

export type SearchOf<R extends AnyRoutes, K extends keyof R> =
  R[K] extends RouteDefinition<infer _, infer S> ? S : never;

/** A route the URL points at, with its decoded params and search. */
export interface LocationOf<R extends AnyRoutes, K extends keyof R> {
  readonly name: K;
  readonly params: ParamsOf<R, K>;
  readonly search: SearchOf<R, K>;
}

/** The page the URL points at, or `notFound`. */
export type Location<R extends AnyRoutes> =
  | { readonly [K in keyof R]: LocationOf<R, K> }[keyof R]
  | { readonly name: "notFound"; readonly path: string };

export interface HrefOptions<P, S> {
  readonly params?: P;
  readonly search?: S;
  readonly hash?: string;
}

export interface RouterOptions {
  /** Where the app lives, such as Vite's `import.meta.env.BASE_URL`. */
  readonly basePath?: string;
  /** The sessionStorage key scroll positions are kept under. */
  readonly scrollKey?: string;
  /** A new address for an old one, so old links and bookmarks still land. */
  readonly redirect?: (url: URL) => string | undefined;
  /**
   * Asked before moving to another page, by a link, `navigate`, back or
   * forward; `false` stays. Such as groundwork-ui's `confirmLeave`, which
   * asks while a form has unsaved changes.
   */
  readonly beforeLeave?: () => boolean | Promise<boolean>;
}

const segments = (path: string) =>
  path.split("/").filter((part) => part !== "");

const matchParams = (pattern: readonly string[], path: readonly string[]) => {
  if (pattern.length !== path.length) return undefined;

  const params = new Map<string, string>();

  for (const [index, part] of pattern.entries()) {
    const actual = path[index] ?? "";

    if (part.startsWith(":")) {
      params.set(part.slice(1), decodeURIComponent(actual));
    } else if (part !== actual) {
      return undefined;
    }
  }

  return Object.fromEntries(params);
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
    const kept = new Map<string, string>();

    for (const [key, value] of Object.entries(entries)) {
      if (
        Option.isSome(decode({ ...Object.fromEntries(kept), [key]: value }))
      ) {
        kept.set(key, value);
      }
    }

    return Schema.decodeUnknownSync(schema)(Object.fromEntries(kept));
  });
};

/**
 * A router over typed routes: their params and search are Schema codecs, so
 * links are built from typed values and URLs decode back to them. The
 * current location is an atom, links within the app navigate without a
 * reload, and scroll positions are restored on back and forward.
 */
export const makeRouter = <const R extends AnyRoutes>(
  routes: R,
  options: RouterOptions = {},
) => {
  const basePath = (options.basePath ?? "").replace(/\/$/, "");
  const scrollKey = options.scrollKey ?? "gw-scroll";
  const navigationEvent = "gw-navigate";

  const compiled = Object.entries(routes).map(([name, definition]) => ({
    name,
    definition,
    pattern: segments(definition.path),
  }));

  const pathOf = (url: URL) =>
    url.pathname.startsWith(basePath)
      ? url.pathname.slice(basePath.length)
      : url.pathname;

  /** The location a URL points at. */
  const parse = (url: URL): Location<R> => {
    const path = pathOf(url);
    const parts = segments(path);

    for (const { name, definition, pattern } of compiled) {
      const raw = matchParams(pattern, parts);

      if (raw === undefined) continue;

      const params = Schema.decodeUnknownOption(definition.params)(raw);

      if (Option.isNone(params)) continue;

      return {
        name,
        params: params.value,
        search: decodeSearch(definition.search, url.searchParams),
      } as Location<R>;
    }

    return { name: "notFound", path };
  };

  /** A link to a route, with its params and search encoded. */
  const href = <K extends keyof R & string>(
    name: K,
    { params, search, hash }: HrefOptions<ParamsOf<R, K>, SearchOf<R, K>> = {},
  ): string => {
    const definition = routes[name];

    if (definition === undefined) return basePath || "/";

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

  const positions = Schema.decodeUnknownOption(
    Schema.fromJsonString(Schema.Record(Schema.String, Schema.Finite)),
  );

  const scrollPositions = (): { readonly [url: string]: number } => {
    try {
      return Option.getOrElse(
        positions(sessionStorage.getItem(scrollKey)),
        () => ({}),
      );
    } catch {
      return {};
    }
  };

  const rememberScroll = () => {
    try {
      sessionStorage.setItem(
        scrollKey,
        JSON.stringify({
          ...scrollPositions(),
          [location.href]: window.scrollY,
        }),
      );
    } catch {
      // Storage can be unavailable, such as in a private window
    }
  };

  let cancelRestore: (() => void) | undefined;

  /**
   * Runs `attempt` each time the page grows until it reports it's done, for
   * up to five seconds. Someone scrolling or typing stops it.
   */
  const scrollWhenReady = (attempt: () => boolean) => {
    cancelRestore?.();

    const run = () => {
      if (attempt()) stop();
    };

    const observer = new ResizeObserver(run);
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

    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        if (cancelRestore !== stop) return;

        observer.observe(document.body);
        run();
      }),
    );
  };

  const restoreScroll = () => {
    const target = scrollPositions()[location.href] ?? 0;

    if (target <= 0) {
      cancelRestore?.();
      window.scrollTo(0, 0);

      return;
    }

    scrollWhenReady(() => {
      if (document.documentElement.scrollHeight - window.innerHeight < target) {
        return false;
      }

      window.scrollTo(0, target);

      return true;
    });
  };

  /** The address of the page showing, which a held back or forward returns to; set once the location is first read. */
  let shown = "";

  /** Runs `go` once `beforeLeave` agrees, at once when nothing asks. */
  const leaving = (go: () => void) => {
    const allowed = options.beforeLeave?.() ?? true;

    if (allowed === true) go();
    else if (allowed !== false) {
      void allowed.then((leave) => {
        if (leave) go();
      });
    }
  };

  const go = (next: URL, navigation: { readonly replace?: boolean }) => {
    const samePath = next.pathname === location.pathname;

    rememberScroll();

    if (navigation.replace) {
      history.replaceState(null, "", next.href);
    } else {
      history.pushState(null, "", next.href);
    }

    if (!samePath) window.scrollTo(0, 0);

    window.dispatchEvent(new Event(navigationEvent));
  };

  /**
   * Goes to a URL within the app without reloading. A new path scrolls to
   * the top; changing only the search keeps the scroll position. Moving to
   * another page asks `beforeLeave` first.
   */
  const navigate = (
    url: string,
    navigation: { readonly replace?: boolean } = {},
  ) => {
    const next = new URL(url, location.href);

    if (next.href === location.href) return;

    if (next.pathname === location.pathname) go(next, navigation);
    else leaving(() => go(next, navigation));
  };

  /** Scrolls a section to the top of the page once the page is tall enough. */
  const scrollToSection = (section: Element) => {
    scrollWhenReady(() => {
      section.scrollIntoView({ block: "start" });

      const margin = Number.parseFloat(
        getComputedStyle(section).scrollMarginTop,
      );

      return Math.abs(section.getBoundingClientRect().top - (margin || 0)) < 2;
    });
  };

  const read = (): Location<R> => {
    const target = options.redirect?.(new URL(location.href));

    if (target !== undefined) history.replaceState(null, "", target);

    shown = location.href;

    return parse(new URL(location.href));
  };

  /** The link within the app a click lands on, if any. */
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

  /** The page to show, from the URL, following links, back and forward. */
  const currentLocation = Atom.readable((get) => {
    const update = () => get.setSelf(read());

    const arrive = () => {
      update();
      restoreScroll();
    };

    const onPopState = () => {
      const left =
        shown !== "" && new URL(shown).pathname !== location.pathname;

      const allowed = left ? (options.beforeLeave?.() ?? true) : true;

      if (allowed === true) {
        arrive();

        return;
      }

      // A pop can't be cancelled, so the page showing is put back while
      // `beforeLeave` asks, and swapped for where the pop went if it leaves
      const target = location.href;

      history.pushState(null, "", shown);

      if (allowed === false) return;

      void allowed.then((leave) => {
        if (!leave) return;

        history.replaceState(null, "", target);
        arrive();
      });
    };

    const onClick = (event: MouseEvent) => {
      const link = appLink(event);

      if (link === undefined) return;

      event.preventDefault();
      navigate(link.href);
    };

    history.scrollRestoration = "manual";
    window.addEventListener("pagehide", rememberScroll);
    window.addEventListener("popstate", onPopState);
    window.addEventListener(navigationEvent, update);
    document.addEventListener("click", onClick);
    restoreScroll();

    get.addFinalizer(() => {
      window.removeEventListener("pagehide", rememberScroll);
      window.removeEventListener("popstate", onPopState);
      window.removeEventListener(navigationEvent, update);
      document.removeEventListener("click", onClick);
    });

    return read();
  }).pipe(Atom.keepAlive);

  /** Replaces some of the current route's search params, keeping the rest. */
  const updateSearch = <K extends keyof R & string>(
    current: LocationOf<R, K>,
    changes: SearchOf<R, K>,
    navigation: { readonly replace?: boolean } = {},
  ) => {
    navigate(
      href(current.name, {
        params: current.params,
        // Spread can't take a generic search type, so merge with assign
        search: Object.assign({}, current.search, changes),
      }),
      navigation,
    );
  };

  return {
    parse,
    href,
    navigate,
    currentLocation,
    updateSearch,
    scrollToSection,
  };
};
