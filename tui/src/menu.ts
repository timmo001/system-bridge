import type {
  MenuItem,
  MenuVariant,
  NotifyConfig,
  ViewId,
  FlagField,
} from "./types.js";

// --- Helpers ---

function item(
  id: string,
  icon: string,
  title: string,
  description: string,
  action: MenuItem["action"],
  variants?: readonly MenuVariant[],
  keywords?: readonly string[],
): MenuItem {
  return {
    id,
    icon,
    title,
    description,
    action,
    ...(variants && { variants }),
    ...(keywords && { keywords }),
  };
}

function cmd(command: string, wait = true): MenuItem["action"] {
  return { type: "command", cmd: command, wait };
}

function silent(command: string): MenuItem["action"] {
  return { type: "silent", cmd: command };
}

function notify(command: string, config: NotifyConfig): MenuItem["action"] {
  return { type: "notify", cmd: command, notify: config };
}

function submenu(menuId: string): MenuItem["action"] {
  return { type: "submenu", menuId };
}

function exec(command: string): MenuItem["action"] {
  return { type: "exec", cmd: command };
}

function flagPopup(
  baseCmd: string,
  title: string,
  fields: readonly FlagField[],
  advancedFieldIndices?: readonly number[],
): MenuItem["action"] {
  return {
    type: "flagPopup",
    baseCmd,
    title,
    fields,
    ...(advancedFieldIndices && { advancedFieldIndices }),
  };
}

// --- Notification flag fields ---

const notificationFields: readonly FlagField[] = [
  {
    name: "title",
    label: "Title",
    type: "string",
    required: false,
    defaultValue: "System Bridge",
    placeholder: "Notification title",
  },
  {
    name: "message",
    label: "Message",
    type: "string",
    required: false,
    defaultValue: "Hello, world!",
    placeholder: "Notification message",
  },
  {
    name: "icon",
    label: "Icon",
    type: "string",
    required: false,
    defaultValue: "system-bridge",
    placeholder: "Icon name",
  },
  {
    name: "sound",
    label: "Sound",
    type: "string",
    required: false,
    placeholder: "Path to sound file (Linux only)",
  },
  {
    name: "action-url",
    label: "Action URL",
    type: "string",
    required: false,
    placeholder: "URL to open on click (Linux only)",
  },
  {
    name: "action-path",
    label: "Action Path",
    type: "string",
    required: false,
    placeholder: "File/folder to open on click (Linux only)",
  },
];

// --- Data run flag fields ---

const dataRunFields: readonly FlagField[] = [
  {
    name: "module",
    label: "Module",
    type: "select",
    required: true,
    placeholder: "Select a module",
    // Options populated dynamically at runtime; "All" appended after fetch
    options: [],
  },
  {
    name: "pretty",
    label: "Pretty Print",
    type: "bool",
    required: false,
    defaultValue: "false",
  },
];

// --- Main menu items ---

export const mainMenuItems: readonly MenuItem[] = [
  item(
    "backend",
    "󰒋",
    "Backend",
    "Start the backend server",
    exec("system-bridge backend"),
    [
      {
        label: "Default",
        description: "Start the backend server",
        action: exec("system-bridge backend"),
      },
      {
        label: "Open Web Client",
        description: "Start backend and open web client in browser",
        action: exec("system-bridge backend --open-web-client"),
      },
    ],
    ["server", "start", "run", "api", "http", "websocket", ":run", ":start", "serve", "launch"],
  ),
  item(
    "client",
    "󰆍",
    "Client",
    "Client commands",
    submenu("client"),
    undefined,
    ["cli", "commands", "tools", ":c", "cmd"],
  ),
  item(
    "version",
    "󰋽",
    "Version",
    "Show application version",
    cmd("system-bridge version"),
    undefined,
    ["ver", "about", "info", ":v", ":ver"],
  ),
  item("quit", "󰩈", "Quit", "Exit the TUI", { type: "quit" }, undefined, [
    ":q",
    ":wq",
    ":qa",
    "exit",
    "close",
    "quit",
    "bye",
  ]),
];

// --- Submenus ---

export const submenus: Map<string, readonly MenuItem[]> = new Map([
  [
    "client",
    [
      item(
        "client.token",
        "󰌆",
        "Token",
        "Print the API token",
        cmd("system-bridge client token"),
        undefined,
        ["key", "api", "auth", "secret", ":token", "apikey"],
      ),
      item(
        "client.notification",
        "󰍡",
        "Notification",
        "Send a notification",
        flagPopup(
          "system-bridge client notification",
          "Send Notification",
          notificationFields,
          [3, 4, 5], // sound, action-url, action-path are advanced
        ),
        undefined,
        ["notify", "alert", "message", "toast", ":notify", "send"],
      ),
      item(
        "client.discovery",
        "󰊗",
        "Discovery",
        "List discovered services on the network",
        cmd("system-bridge client discovery list"),
        undefined,
        ["mdns", "services", "network", "find", "scan", ":disc", "discover"],
      ),
      item(
        "client.data",
        "󰆼",
        "Data",
        "Data modules",
        submenu("client.data"),
        undefined,
        ["modules", "info", "system", "cpu", "memory", ":data", "stats"],
      ),
    ],
  ],
  [
    "client.data",
    [
      item(
        "client.data.list",
        "󰋘",
        "List Modules",
        "List available data modules",
        cmd("system-bridge client data list"),
        [
          {
            label: "Table",
            description: "Output as table (default)",
            action: cmd("system-bridge client data list --table"),
          },
          {
            label: "JSON",
            description: "Output as JSON array",
            action: cmd("system-bridge client data list --json"),
          },
        ],
        ["modules", "available", ":list", "show"],
      ),
      item(
        "client.data.run",
        "󰐊",
        "Run Module",
        "Run a data module and print output",
        flagPopup(
          "system-bridge client data run",
          "Run Data Module",
          dataRunFields,
        ),
        undefined,
        [
          "execute",
          "module",
          ":run",
          ":exec",
          "cpu",
          "memory",
          "battery",
          "disks",
          "displays",
          "gpus",
          "media",
          "networks",
          "processes",
          "sensors",
          "system",
        ],
      ),
    ],
  ],
]);

// --- Submenu display titles (for breadcrumbs) ---

export const submenuTitles: Map<string, string> = new Map([
  ["client", "Client"],
  ["client.data", "Data"],
]);

// --- Flat lookup of every menu item by ID ---

function buildItemMap(): Map<string, MenuItem> {
  const map = new Map<string, MenuItem>();
  for (const item of mainMenuItems) {
    map.set(item.id, item);
  }
  for (const [, items] of submenus) {
    for (const item of items) {
      map.set(item.id, item);
    }
  }
  return map;
}

export const menuItemsById: Map<string, MenuItem> = buildItemMap();
