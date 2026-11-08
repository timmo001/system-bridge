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
import { GwDialog, on } from "@timmo001/groundwork-ui";
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

/** One of a form's native fields, inside its Groundwork component. */
const fieldOf = (form: HTMLFormElement, name: string) => {
  const input = form.elements.namedItem(name);

  if (!(input instanceof HTMLInputElement)) {
    throw new Error(`The form has no ${name}`);
  }

  return input;
};

const field = (name: string) => fieldOf(manual, name);

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

type Computer = (typeof Computers.Type)[number];

// mdi's dots-vertical, pencil and delete, copied in rather than adding
// @mdi/js to the page for three icons
const icons = {
  more: "M12,16A2,2 0 0,1 14,18A2,2 0 0,1 12,20A2,2 0 0,1 10,18A2,2 0 0,1 12,16M12,10A2,2 0 0,1 14,12A2,2 0 0,1 12,14A2,2 0 0,1 10,12A2,2 0 0,1 12,10M12,4A2,2 0 0,1 14,6A2,2 0 0,1 12,8A2,2 0 0,1 10,6A2,2 0 0,1 12,4Z",
  edit: "M20.71,7.04C21.1,6.65 21.1,6 20.71,5.63L18.37,3.29C18,2.9 17.35,2.9 16.96,3.29L15.12,5.12L18.87,8.87M3,17.25V21H6.75L17.81,9.93L14.06,6.18L3,17.25Z",
  remove:
    "M19,4H15.5L14.5,3H9.5L8.5,4H5V6H19M6,19A2,2 0 0,0 8,21H16A2,2 0 0,0 18,19V7H6V19Z",
};

const editDialog = find("#edit", GwDialog);
const editForm = find("form.edit", HTMLFormElement);
const editError = find(".edit-error", HTMLElement);
const removeDialog = find("#remove", GwDialog);

/** The computer the open dialog is about. */
let chosen: Computer | undefined;

const showEdit = (computer: Computer) => {
  const url = new URL(computer.url);

  chosen = computer;
  editError.textContent = "";
  fieldOf(editForm, "name").value = computer.name;
  fieldOf(editForm, "host").value = url.hostname.replace(/^\[|\]$/g, "");
  fieldOf(editForm, "port").value =
    url.port || (url.protocol === "https:" ? "443" : "80");
  fieldOf(editForm, "https").checked = url.protocol === "https:";
  fieldOf(editForm, "token").value = "";
  editDialog.show();
};

const showRemove = (computer: Computer) => {
  chosen = computer;
  find(".remove-text", HTMLElement).textContent =
    `The app forgets ${computer.name} and stops getting its pushes. You can pair it again at any time.`;
  removeDialog.show();
};

/** A paired computer's row: tap it to open, ⋮ to edit or remove it. */
const computerRow = (computer: Computer) => {
  const item = document.createElement("div");
  const opener = document.createElement("button");
  const name = document.createElement("span");
  const url = document.createElement("span");
  const menu = document.createElement("gw-menu-button");

  item.className = "computer";
  item.setAttribute("role", "listitem");
  opener.type = "button";
  opener.className = "open";
  name.className = "name";
  name.textContent = computer.name;
  url.className = "url";
  url.textContent = computer.url;
  opener.append(name, url);
  opener.addEventListener("click", () => void open(computer.id));

  if (computer.current) {
    const chip = document.createElement("gw-chip");

    chip.setAttribute("size", "small");
    chip.textContent = "Current";
    name.append(" ", chip);
  }

  menu.setAttribute("appearance", "plain");
  menu.setAttribute("labels", "hide");
  menu.setAttribute("label", `More for ${computer.name}`);
  menu.setAttribute("icon", icons.more);
  menu.items = [
    { value: "edit", label: "Edit", icon: icons.edit },
    { value: "remove", label: "Remove", icon: icons.remove },
  ];
  on(menu, "select", (event) => {
    if (event.detail.value === "edit") showEdit(computer);
    else if (event.detail.value === "remove") showRemove(computer);
  });

  item.append(opener, menu);

  return item;
};

const renderPaired = async () => {
  const computers = mobile.shell ? await mobile.call("servers", Computers) : [];

  paired.hidden = computers.length === 0;
  find("#paired .list", HTMLElement).replaceChildren(
    ...computers.map(computerRow),
  );

  return computers;
};

find("#edit gw-button.save", HTMLElement).addEventListener("click", () => {
  const computer = chosen;

  if (computer === undefined || !editForm.reportValidity()) return;

  void attempt(editError, async () => {
    const scheme = fieldOf(editForm, "https").checked ? "https" : "http";
    const host = fieldOf(editForm, "host").value.trim();

    await mobile.call("editServer", Schema.Boolean, {
      id: computer.id,
      name: fieldOf(editForm, "name").value.trim(),
      url: `${scheme}://${host.includes(":") ? `[${host}]` : host}:${fieldOf(editForm, "port").value.trim()}/`,
      token: fieldOf(editForm, "token").value.trim(),
    });
    editDialog.close();
    await renderPaired();
  });
});

find("#remove gw-button.confirm", HTMLElement).addEventListener("click", () => {
  const computer = chosen;

  removeDialog.close();

  if (computer !== undefined) {
    void mobile
      .call("removeServer", Schema.Boolean, { id: computer.id })
      .then(renderPaired);
  }
});

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
      hint: "Open Settings, Devices on the computer",
    });

    if (text === undefined) return;

    if (parsePairingLink(text) === undefined) {
      throw new Error("That isn't a System Bridge pairing code");
    }

    await mobile.call("pair", Paired, { link: text });
  }),
);

const discoverButton = find("gw-button.discover", HTMLElement);

/** Lists the computers found on the network, each to fill the form with. */
const discover = (mode: "browse" | "picker") =>
  attempt(errors.discover, async () => {
    const found = find(".found", HTMLElement);

    if (mode === "browse") found.textContent = "Looking for computers…";

    const services = await mobile.discoverServices({
      type: "_system-bridge._tcp",
      mode,
    });

    // One already paired, by the uuid it advertises, can't be added again
    const pairedIds = new Set(
      (mobile.shell ? await mobile.call("servers", Computers) : []).map(
        (computer) => computer.id,
      ),
    );

    found.replaceChildren(
      ...services.map((service) => {
        const added = pairedIds.has(service.txt["uuid"] ?? "");

        const use = button(added ? "Added" : "Use", () => {
          if (!added) fill(service);
        });

        if (added) use.setAttribute("disabled", "");

        return row(
          service.name,
          `${service.txt["ip"] ?? service.host ?? service.hostname ?? ""}:${service.port}`,
          [use],
        );
      }),
    );

    if (services.length === 0) {
      throw new Error("No computers found. Check System Bridge is running.");
    }
  });

// Without local network access, the system's picker grants the one
// computer chosen
discoverButton.addEventListener(
  "click",
  () =>
    void allowNetwork().then((allowed) =>
      discover(allowed ? "browse" : "picker"),
    ),
);

// With it, the page looks as it opens, and the button isn't needed
if (mobile.shell && (await mobile.localNetwork()) === "granted") {
  discoverButton.hidden = true;
  void discover("browse");
}

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
