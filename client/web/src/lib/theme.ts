import type { GwThemePicker } from "@timmo001/groundwork-ui/gw-theme-picker.ts";
import { on } from "@timmo001/groundwork-ui/on.ts";
import {
  pageTheme,
  type ThemeChoice,
  type ThemeMode,
} from "@timmo001/groundwork-tokens/page";
import { Result } from "effect";

import { themeOptions } from "./theme-options";

/**
 * The theme families offered, Bridge first, each theme by id, name and the
 * one mode it covers, if it has only one.
 */
const families = [
  { group: undefined, themes: [["bridge", "Bridge", undefined]] },
  {
    group: "Catppuccin",
    themes: [
      ["catppuccin-latte", "Latte", "light"],
      ["catppuccin-frappe", "Frappé", "dark"],
      ["catppuccin-macchiato", "Macchiato", "dark"],
      ["catppuccin-mocha", "Mocha", "dark"],
    ],
  },
  {
    group: "Tokyo Night",
    themes: [
      ["tokyo-night-day", "Day", "light"],
      ["tokyo-night", "Night", "dark"],
      ["tokyo-night-storm", "Storm", "dark"],
      ["tokyo-night-moon", "Moon", "dark"],
    ],
  },
] as const;

const themeChoices: readonly (ThemeChoice & {
  readonly group: string | undefined;
})[] = families.flatMap(({ group, themes }) =>
  themes.map(([id, name, mode]) => ({ id, name, group, mode })),
);

const page = pageTheme({
  ...themeOptions,
  themes: themeChoices,
  // For the WebMCP theme tools, so an agent can pick any offered theme
  documents: async () => {
    const { parseTheme } = await import("@timmo001/groundwork-tokens/runtime");

    const documents = await Promise.all([
      import("@timmo001/groundwork-tokens/themes/bridge.json"),
      import("@timmo001/groundwork-tokens/themes/catppuccin-latte.json"),
      import("@timmo001/groundwork-tokens/themes/catppuccin-frappe.json"),
      import("@timmo001/groundwork-tokens/themes/catppuccin-macchiato.json"),
      import("@timmo001/groundwork-tokens/themes/catppuccin-mocha.json"),
      import("@timmo001/groundwork-tokens/themes/tokyo-night-day.json"),
      import("@timmo001/groundwork-tokens/themes/tokyo-night.json"),
      import("@timmo001/groundwork-tokens/themes/tokyo-night-storm.json"),
      import("@timmo001/groundwork-tokens/themes/tokyo-night-moon.json"),
    ]);

    return documents.flatMap(({ default: document }) => {
      // Decoded by the kit, whose Effect may differ from the app's
      const parsed = parseTheme(JSON.stringify(document));

      return Result.isSuccess(parsed) ? [parsed.success] : [];
    });
  },
});

const modes: readonly ThemeMode[] = ["auto", "light", "dark", "darker"];

const choices = (custom: string | null) => [
  ...themeChoices.map(({ id, name, group }) => ({
    value: id,
    label: name,
    group,
  })),
  ...(custom === null ? [] : [{ value: "custom", label: custom }]),
];

/** Keeps `picker` in step with the page's theme and applies what it picks. */
export const bindThemePicker = (picker: GwThemePicker) => {
  const sync = () => {
    const state = page.state();
    picker.mode = state.mode;
    picker.theme = state.theme;
    picker.themes = choices(state.custom);
  };

  sync();

  const stops = [
    page.subscribe(sync),
    on(picker, "mode", (event) => {
      const mode = modes.find((known) => known === event.detail.mode);

      if (mode !== undefined) {
        page.setMode(mode);
      }
    }),
    on(picker, "theme", (event) => page.setTheme(event.detail.id)),
    on(picker, "import", (event) => {
      void page.importTheme(event.detail.text).then((result) => {
        picker.status = result.ok
          ? result.misses.length === 0
            ? `Using ${result.name}`
            : `Using ${result.name}. Some colours miss their contrast target: ${result.misses.join(", ")}`
          : result.error;
      });
    }),
    on(picker, "reset", () => {
      page.reset();
      picker.status = "";
    }),
  ];

  return () => {
    for (const stop of stops) stop();
  };
};
