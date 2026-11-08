/**
 * The pairing page's script. Pairing itself runs in the app's Kotlin, as
 * this page is served over HTTPS and can't fetch a computer's plain HTTP
 * address: the page finds the computer and hands the app a pairing link or
 * an address and token. Once one is paired the app opens its web client.
 */
import "@timmo001/groundwork-tokens/themes.css";
import "./index.css";
import "@timmo001/groundwork-ui";
import {
  connectMobile,
  type DiscoveredService,
} from "@timmo001/groundwork-mobile/view";
import { parsePairingLink } from "@timmo001/groundwork-pwa/pairing";
import {
  coreThemeChoices,
  pageTheme,
  themeOptions as pickerOptions,
  type ThemeMode,
} from "@timmo001/groundwork-tokens/page";
import { on } from "@timmo001/groundwork-ui";
import { Schema } from "effect";

import mobileConfig from "../mobile.config.ts";
import { themeOptions } from "./theme.ts";

/** A paired computer, as the app lists them, never with its token. */
const Computers = Schema.Array(
  Schema.Struct({
    id: Schema.String,
    name: Schema.String,
    url: Schema.String,
    current: Schema.Boolean,
  }),
);

/** What the app answers once a computer is paired or added. */
const Paired = Schema.Struct({ id: Schema.String, name: Schema.String });

const modes: readonly ThemeMode[] = ["auto", "light", "dark", "darker"];

const themes = coreThemeChoices.filter(({ id }) => id === "bridge");

const page = pageTheme({ ...themeOptions, themes });

const picker = document.querySelector("gw-theme-picker");

// Bridge, and the phone's dynamic colour once the app passes it
if (picker !== null) {
  const render = () => {
    const { mode, theme, android } = page.state();

    picker.mode = mode;
    picker.theme = theme;
    picker.themes = [
      ...pickerOptions(themes, ""),
      ...(android === null
        ? []
        : [{ value: android.id, label: android.name, group: "Phone" }]),
    ];
  };

  page.subscribe(render);
  render();
  on(picker, "mode", (event) => {
    const mode = modes.find((entry) => entry === event.detail.mode);

    if (mode !== undefined) page.setMode(mode);
  });
  on(picker, "theme", (event) => page.setTheme(event.detail.id));
  on(picker, "reset", () => page.reset());
}

const mobile = await connectMobile(mobileConfig, {
  onAndroidTheme: (colors) => void page.setAndroidTheme(colors),
});

const find = <E extends Element>(selector: string, type: new () => E): E => {
  const found = document.querySelector(selector);

  if (!(found instanceof type)) throw new Error(`The page has no ${selector}`);

  return found;
};

const network = find("#network", HTMLElement);
const paired = find("#paired", HTMLElement);
const manual = find("form.manual", HTMLFormElement);

const errors = {
  scan: find(".scan-error", HTMLElement),
  discover: find(".discover-error", HTMLElement),
  manual: find(".manual-error", HTMLElement),
};

/** Runs an action, showing why it failed under its card. */
const attempt = async (shown: HTMLElement, run: () => Promise<void>) => {
  shown.textContent = "";

  try {
    await run();
  } catch (error) {
    shown.textContent =
      error instanceof Error ? error.message : "Something went wrong";
  }
};

/** One of the form's native fields, inside its Groundwork component. */
const field = (name: string) => {
  const input = manual.elements.namedItem(name);

  if (!(input instanceof HTMLInputElement)) {
    throw new Error(`The form has no ${name}`);
  }

  return input;
};

/**
 * Asks for local network access where Android gates it, showing why it's
 * needed when it's refused. Says whether the app has it.
 */
const allowNetwork = async () => {
  const state = await mobile.localNetwork();

  network.hidden = state !== "denied";

  return state !== "denied";
};

const button = (
  label: string,
  run: () => void,
  appearance = "outlined",
): HTMLElement => {
  const element = document.createElement("gw-button");

  element.setAttribute("appearance", appearance);
  element.setAttribute("size", "small");
  element.textContent = label;
  element.addEventListener("click", run);

  return element;
};

const row = (heading: string, description: string, actions: HTMLElement[]) => {
  const element = document.createElement("gw-setting-row");

  element.setAttribute("heading", heading);
  element.setAttribute("description", description);
  element.append(...actions);

  return element;
};

/** Opens a paired computer, once the app may reach it. */
const open = async (id: string) => {
  if (await allowNetwork())
    await mobile.call("selectServer", Schema.Boolean, { id });
};

const renderPaired = async () => {
  const computers = mobile.shell ? await mobile.call("servers", Computers) : [];
  const list = find("#paired .list", HTMLElement);

  paired.hidden = computers.length === 0;
  list.replaceChildren(
    ...computers.map((computer) =>
      row(computer.name, computer.url, [
        button("Open", () => void open(computer.id), "filled"),
        button("Remove", () => {
          void mobile
            .call("removeServer", Schema.Boolean, { id: computer.id })
            .then(renderPaired);
        }),
      ]),
    ),
  );

  return computers;
};

/** Fills the form with a computer found on the network. */
const fill = (service: DiscoveredService) => {
  field("host").value =
    service.txt["ip"] ?? service.host ?? service.hostname ?? "";
  field("port").value = service.txt["port"] ?? String(service.port);
  manual.scrollIntoView({ behavior: "smooth" });
};

find("gw-button.allow", HTMLElement).addEventListener("click", () => {
  void allowNetwork().then(async (allowed) => {
    const current = (await renderPaired()).find((computer) => computer.current);

    if (allowed && current !== undefined) await open(current.id);
  });
});

find("gw-button.scan", HTMLElement).addEventListener("click", () =>
  attempt(errors.scan, async () => {
    if (!(await allowNetwork())) return;

    const text = await mobile.scanQr({
      hint: "Open Settings, Phones on the computer",
    });

    if (text === undefined) return;

    if (parsePairingLink(text) === undefined) {
      throw new Error("That isn't a System Bridge pairing code");
    }

    await mobile.call("pair", Paired, { link: text });
  }),
);

find("gw-button.discover", HTMLElement).addEventListener("click", () =>
  attempt(errors.discover, async () => {
    // Without local network access, the system's picker grants the one
    // computer chosen
    const services = await mobile.discoverServices({
      type: "_system-bridge._tcp",
      mode: (await allowNetwork()) ? "browse" : "picker",
    });

    find(".found", HTMLElement).replaceChildren(
      ...services.map((service) =>
        row(
          service.name,
          `${service.txt["ip"] ?? service.host ?? service.hostname ?? ""}:${service.port}`,
          [button("Use", () => fill(service))],
        ),
      ),
    );

    if (services.length === 0) {
      throw new Error("No computers found. Check System Bridge is running.");
    }
  }),
);

manual.addEventListener("submit", (event) => {
  event.preventDefault();

  void attempt(errors.manual, async () => {
    if (!(await allowNetwork())) return;

    const scheme = field("https").checked ? "https" : "http";

    await mobile.call("addServer", Paired, {
      url: `${scheme}://${field("host").value.trim()}:${field("port").value.trim()}/`,
      token: field("token").value.trim(),
    });
  });
});

/**
 * A computer's base URLs from what it advertises over mDNS: its .local
 * name first, as that survives its next new address, then its address.
 */
const advertisedUrls = (service: DiscoveredService, scheme: string) => {
  const port = service.txt["port"] ?? String(service.port);
  const name = service.hostname?.replace(/\.$/, "").replace(/\.local$/, "");

  const hosts = [
    name === undefined || name === "" ? undefined : `${name}.local`,
    service.txt["ip"] ?? service.host ?? undefined,
  ].filter((host): host is string => host !== undefined && host !== "");

  return [...new Set(hosts)].map(
    (host) => `${scheme}//${host.includes(":") ? `[${host}]` : host}:${port}/`,
  );
};

/**
 * The app couldn't load a paired computer's page: say so, and look for it on
 * the network by the uuid it advertises, in case it has moved. Found at a
 * new address, the app keeps that and opens it.
 */
const showUnreachable = async (computer: (typeof Computers.Type)[number]) => {
  const card = find("#unreachable", HTMLElement);
  const status = find("#unreachable .status", HTMLElement);

  card.setAttribute("heading", `Can't reach ${computer.name}`);
  card.hidden = false;
  status.textContent = `System Bridge isn't answering at ${computer.url}. Looking for it on your network…`;

  find("#unreachable gw-button.retry", HTMLElement).addEventListener(
    "click",
    () => void open(computer.id),
  );

  if ((await mobile.localNetwork()) !== "granted") {
    status.textContent = `System Bridge isn't answering at ${computer.url}. Allow local network access to look for it.`;

    return;
  }

  const found = await mobile
    .discoverServices({ type: "_system-bridge._tcp", mode: "browse" })
    .then((services) =>
      services.find((service) => service.txt["uuid"] === computer.id),
    )
    .catch(() => undefined);

  if (found === undefined) {
    status.textContent = `System Bridge isn't answering at ${computer.url}, and it isn't on this network. Is the computer on, with System Bridge running?`;

    return;
  }

  status.textContent = `Found ${computer.name} on your network. Opening it…`;

  const moved = await mobile.call(
    "updateServer",
    Schema.NullOr(Schema.String),
    {
      id: computer.id,
      urls: advertisedUrls(found, new URL(computer.url).protocol),
    },
  );

  if (moved === null) {
    status.textContent = `${computer.name} is on this network, but System Bridge didn't answer. Try again.`;
  }
};

// Back here with computers paired means local network access is missing,
// a computer couldn't be reached, or the person chose to add another
const computers = await renderPaired();
const unreachable = new URLSearchParams(location.search).get("unreachable");
const lost = computers.find((computer) => computer.id === unreachable);

if (lost !== undefined) void showUnreachable(lost);
else if (computers.length > 0) void allowNetwork();
