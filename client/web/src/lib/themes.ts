import { Schema } from "effect";

/** Whether a theme is light or dark, which decides when it can be used. */
export const ColorScheme = Schema.Literals(["light", "dark"]);

export type ColorScheme = typeof ColorScheme.Type;

/** How the colour scheme is chosen: from the system, or always one of them. */
export const ThemeMode = Schema.Literals(["system", "light", "dark"]);

export type ThemeMode = typeof ThemeMode.Type;

export const ThemeId = Schema.Literals([
  "system-bridge-light",
  "system-bridge-dark",
  "catppuccin-latte",
  "catppuccin-frappe",
  "catppuccin-macchiato",
  "catppuccin-mocha",
  "tokyo-night-day",
  "tokyo-night",
  "tokyo-night-storm",
  "tokyo-night-moon",
  "rose-pine-dawn",
  "rose-pine",
  "rose-pine-moon",
  "midnight",
  "nord-light",
  "nord",
  "dracula",
  "gruvbox-light",
  "gruvbox-dark",
  "solarized-light",
  "solarized-dark",
]);

export type ThemeId = typeof ThemeId.Type;

/** The colours every theme sets. Each becomes a `--sb-color-*` variable. */
export interface ThemeColors {
  readonly bg: string;
  readonly surface: string;
  readonly raised: string;
  readonly sunken: string;
  readonly text: string;
  readonly muted: string;
  readonly border: string;
  readonly accent: string;
  readonly onAccent: string;
  readonly success: string;
  readonly warning: string;
  readonly danger: string;
  readonly info: string;
  readonly chart: readonly [string, string, string, string, string, string];
}

export interface Theme {
  readonly id: ThemeId;
  readonly name: string;
  readonly family: string;
  readonly scheme: ColorScheme;
  readonly colors: ThemeColors;
}

/** Catppuccin's flavours, from https://catppuccin.com/palette. */
const catppuccin = (
  id: ThemeId,
  name: string,
  scheme: ColorScheme,
  p: {
    readonly crust: string;
    readonly mantle: string;
    readonly base: string;
    readonly surface0: string;
    readonly surface1: string;
    readonly text: string;
    readonly subtext0: string;
    readonly mauve: string;
    readonly blue: string;
    readonly green: string;
    readonly yellow: string;
    readonly red: string;
    readonly peach: string;
    readonly sapphire: string;
    readonly pink: string;
    readonly teal: string;
  },
): Theme => ({
  id,
  name,
  family: "Catppuccin",
  scheme,
  colors: {
    bg: scheme === "light" ? p.mantle : p.crust,
    surface: scheme === "light" ? p.base : p.mantle,
    raised: p.base,
    sunken: p.crust,
    text: p.text,
    muted: p.subtext0,
    border: scheme === "light" ? p.surface1 : p.surface0,
    accent: p.mauve,
    onAccent: scheme === "light" ? p.base : p.crust,
    success: p.green,
    warning: p.yellow,
    danger: p.red,
    info: p.sapphire,
    chart: [p.blue, p.peach, p.green, p.mauve, p.pink, p.teal],
  },
});

/** Tokyo Night's styles, from folke/tokyonight.nvim. */
const tokyoNight = (
  id: ThemeId,
  name: string,
  scheme: ColorScheme,
  p: {
    readonly bgDark: string;
    readonly bg: string;
    readonly bgHighlight: string;
    readonly fg: string;
    readonly comment: string;
    readonly border: string;
    readonly blue: string;
    readonly cyan: string;
    readonly magenta: string;
    readonly green: string;
    readonly yellow: string;
    readonly red: string;
    readonly orange: string;
    readonly teal: string;
  },
): Theme => ({
  id,
  name,
  family: "Tokyo Night",
  scheme,
  colors: {
    bg: p.bgDark,
    surface: p.bg,
    raised: p.bgHighlight,
    sunken: p.bgDark,
    text: p.fg,
    muted: p.comment,
    border: p.border,
    accent: p.blue,
    onAccent: p.bgDark,
    success: p.green,
    warning: p.yellow,
    danger: p.red,
    info: p.cyan,
    chart: [p.blue, p.orange, p.green, p.magenta, p.red, p.teal],
  },
});

/** Rosé Pine's variants, from https://rosepinetheme.com/palette. */
const rosePine = (
  id: ThemeId,
  name: string,
  scheme: ColorScheme,
  p: {
    readonly base: string;
    readonly surface: string;
    readonly overlay: string;
    readonly muted: string;
    readonly subtle: string;
    readonly text: string;
    readonly love: string;
    readonly gold: string;
    readonly rose: string;
    readonly pine: string;
    readonly foam: string;
    readonly iris: string;
    readonly highlightMed: string;
  },
): Theme => ({
  id,
  name,
  family: "Rosé Pine",
  scheme,
  colors: {
    bg: p.base,
    surface: p.surface,
    raised: p.overlay,
    sunken: p.base,
    text: p.text,
    muted: p.subtle,
    border: p.highlightMed,
    accent: p.iris,
    onAccent: p.base,
    success: p.pine,
    warning: p.gold,
    danger: p.love,
    info: p.foam,
    chart: [p.foam, p.gold, p.pine, p.iris, p.love, p.rose],
  },
});

/**
 * A theme with some colours swapped, where its palette's own choice is too
 * faint to read: text must reach a 4.5:1 contrast, as WCAG AA asks.
 */
const withColors = (theme: Theme, colors: Partial<ThemeColors>): Theme => ({
  ...theme,
  colors: { ...theme.colors, ...colors },
});

const systemBridgeLight: Theme = {
  id: "system-bridge-light",
  name: "Light",
  family: "System Bridge",
  scheme: "light",
  colors: {
    bg: "#f5f6f8",
    surface: "#ffffff",
    raised: "#ffffff",
    sunken: "#eceef2",
    text: "#17181c",
    muted: "#5f6170",
    border: "#dfe1e7",
    accent: "#2563eb",
    onAccent: "#ffffff",
    success: "#15803d",
    warning: "#b45309",
    danger: "#dc2626",
    info: "#0e7490",
    chart: ["#2563eb", "#ea580c", "#16a34a", "#9333ea", "#db2777", "#0891b2"],
  },
};

const systemBridgeDark: Theme = {
  id: "system-bridge-dark",
  name: "Dark",
  family: "System Bridge",
  scheme: "dark",
  colors: {
    bg: "#0f1014",
    surface: "#17181e",
    raised: "#1f2028",
    sunken: "#0b0c0f",
    text: "#ececf1",
    muted: "#9a9cab",
    border: "#2a2b35",
    accent: "#60a5fa",
    onAccent: "#0b0c0f",
    success: "#4ade80",
    warning: "#fbbf24",
    danger: "#f87171",
    info: "#22d3ee",
    chart: ["#60a5fa", "#fb923c", "#4ade80", "#c084fc", "#f472b6", "#22d3ee"],
  },
};

export const themes: readonly Theme[] = [
  systemBridgeLight,
  systemBridgeDark,
  withColors(
    catppuccin("catppuccin-latte", "Latte", "light", {
      crust: "#dce0e8",
      mantle: "#e6e9ef",
      base: "#eff1f5",
      surface0: "#ccd0da",
      surface1: "#bcc0cc",
      text: "#4c4f69",
      subtext0: "#6c6f85",
      mauve: "#8839ef",
      blue: "#1e66f5",
      green: "#40a02b",
      yellow: "#df8e1d",
      red: "#d20f39",
      peach: "#fe640b",
      sapphire: "#209fb5",
      pink: "#ea76cb",
      teal: "#179299",
    }),
    // Subtext 1, as Subtext 0 is too faint on Base
    { muted: "#5c5f77" },
  ),
  catppuccin("catppuccin-frappe", "Frappé", "dark", {
    crust: "#232634",
    mantle: "#292c3c",
    base: "#303446",
    surface0: "#414559",
    surface1: "#51576d",
    text: "#c6d0f5",
    subtext0: "#a5adce",
    mauve: "#ca9ee6",
    blue: "#8caaee",
    green: "#a6d189",
    yellow: "#e5c890",
    red: "#e78284",
    peach: "#ef9f76",
    sapphire: "#85c1dc",
    pink: "#f4b8e4",
    teal: "#81c8be",
  }),
  catppuccin("catppuccin-macchiato", "Macchiato", "dark", {
    crust: "#181926",
    mantle: "#1e2030",
    base: "#24273a",
    surface0: "#363a4f",
    surface1: "#494d64",
    text: "#cad3f5",
    subtext0: "#a5adcb",
    mauve: "#c6a0f6",
    blue: "#8aadf4",
    green: "#a6da95",
    yellow: "#eed49f",
    red: "#ed8796",
    peach: "#f5a97f",
    sapphire: "#7dc4e4",
    pink: "#f5bde6",
    teal: "#8bd5ca",
  }),
  catppuccin("catppuccin-mocha", "Mocha", "dark", {
    crust: "#11111b",
    mantle: "#181825",
    base: "#1e1e2e",
    surface0: "#313244",
    surface1: "#45475a",
    text: "#cdd6f4",
    subtext0: "#a6adc8",
    mauve: "#cba6f7",
    blue: "#89b4fa",
    green: "#a6e3a1",
    yellow: "#f9e2af",
    red: "#f38ba8",
    peach: "#fab387",
    sapphire: "#74c7ec",
    pink: "#f5c2e7",
    teal: "#94e2d5",
  }),
  withColors(
    tokyoNight("tokyo-night-day", "Day", "light", {
      bgDark: "#d0d5e3",
      bg: "#e1e2e7",
      bgHighlight: "#e9e9ed",
      fg: "#3760bf",
      comment: "#6172b0",
      border: "#b4b5b9",
      blue: "#2e7de9",
      cyan: "#007197",
      magenta: "#9854f1",
      green: "#587539",
      yellow: "#8c6c3e",
      red: "#f52a65",
      orange: "#b15c00",
      teal: "#118c74",
    }),
    // Day's foreground is too faint on its own backgrounds, so the text is
    // a deeper shade of it and the accent takes the original
    {
      bg: "#e1e2e7",
      surface: "#e9e9ed",
      raised: "#f4f4f6",
      text: "#2a4485",
      muted: "#4b5683",
      accent: "#3760bf",
      onAccent: "#ffffff",
    },
  ),
  withColors(
    tokyoNight("tokyo-night", "Night", "dark", {
      bgDark: "#16161e",
      bg: "#1a1b26",
      bgHighlight: "#24283b",
      fg: "#c0caf5",
      comment: "#737aa2",
      border: "#292e42",
      blue: "#7aa2f7",
      cyan: "#7dcfff",
      magenta: "#bb9af7",
      green: "#9ece6a",
      yellow: "#e0af68",
      red: "#f7768e",
      orange: "#ff9e64",
      teal: "#1abc9c",
    }),
    // The dark foreground, as the comment colour is too faint for text
    { muted: "#a9b1d6" },
  ),
  withColors(
    tokyoNight("tokyo-night-storm", "Storm", "dark", {
      bgDark: "#1f2335",
      bg: "#24283b",
      bgHighlight: "#292e42",
      fg: "#c0caf5",
      comment: "#737aa2",
      border: "#3b4261",
      blue: "#7aa2f7",
      cyan: "#7dcfff",
      magenta: "#bb9af7",
      green: "#9ece6a",
      yellow: "#e0af68",
      red: "#f7768e",
      orange: "#ff9e64",
      teal: "#1abc9c",
    }),
    { muted: "#a9b1d6" },
  ),
  tokyoNight("tokyo-night-moon", "Moon", "dark", {
    bgDark: "#1e2030",
    bg: "#222436",
    bgHighlight: "#2f334d",
    fg: "#c8d3f5",
    comment: "#828bb8",
    border: "#3b4261",
    blue: "#82aaff",
    cyan: "#86e1fc",
    magenta: "#c099ff",
    green: "#c3e88d",
    yellow: "#ffc777",
    red: "#ff757f",
    orange: "#ff966c",
    teal: "#4fd6be",
  }),
  withColors(
    rosePine("rose-pine-dawn", "Dawn", "light", {
      base: "#faf4ed",
      surface: "#fffaf3",
      overlay: "#f2e9e1",
      muted: "#9893a5",
      subtle: "#797593",
      text: "#575279",
      love: "#b4637a",
      gold: "#ea9d34",
      rose: "#d7827e",
      pine: "#286983",
      foam: "#56949f",
      iris: "#907aa9",
      highlightMed: "#dfdad9",
    }),
    // Iris and Subtle are too faint on Dawn's light surfaces, so buttons
    // use Pine and secondary text a deeper Subtle
    { muted: "#686482", accent: "#286983", onAccent: "#fffaf3" },
  ),
  rosePine("rose-pine", "Main", "dark", {
    base: "#191724",
    surface: "#1f1d2e",
    overlay: "#26233a",
    muted: "#6e6a86",
    subtle: "#908caa",
    text: "#e0def4",
    love: "#eb6f92",
    gold: "#f6c177",
    rose: "#ebbcba",
    pine: "#31748f",
    foam: "#9ccfd8",
    iris: "#c4a7e7",
    highlightMed: "#403d52",
  }),
  withColors(
    rosePine("rose-pine-moon", "Moon", "dark", {
      base: "#232136",
      surface: "#2a273f",
      overlay: "#393552",
      muted: "#6e6a86",
      subtle: "#908caa",
      text: "#e0def4",
      love: "#eb6f92",
      gold: "#f6c177",
      rose: "#ea9a97",
      pine: "#3e8fb0",
      foam: "#9ccfd8",
      iris: "#c4a7e7",
      highlightMed: "#44415a",
    }),
    // A touch lighter than Subtle, which falls just short on Moon's surface
    { muted: "#9b97b5" },
  ),
  {
    id: "midnight",
    name: "Midnight",
    family: "Midnight",
    scheme: "dark",
    colors: {
      bg: "#000000",
      surface: "#0a0c12",
      raised: "#121622",
      sunken: "#000000",
      text: "#e4e8f2",
      muted: "#8891a7",
      border: "#1b2131",
      accent: "#7c93ff",
      onAccent: "#000000",
      success: "#3ddc97",
      warning: "#f5c451",
      danger: "#ff6b81",
      info: "#4cc9f0",
      chart: ["#7c93ff", "#ff9f5a", "#3ddc97", "#c77dff", "#ff6b81", "#4cc9f0"],
    },
  },
  {
    id: "nord-light",
    name: "Snow Storm",
    family: "Nord",
    scheme: "light",
    colors: {
      bg: "#e5e9f0",
      surface: "#eceff4",
      raised: "#f8f9fb",
      sunken: "#d8dee9",
      text: "#2e3440",
      muted: "#4c566a",
      border: "#d8dee9",
      // Frost 4, deepened so white text on it is readable
      accent: "#4a6a92",
      onAccent: "#ffffff",
      success: "#4f7a3a",
      warning: "#a57a1c",
      danger: "#bf616a",
      info: "#3b7f8f",
      chart: ["#5e81ac", "#d08770", "#a3be8c", "#b48ead", "#bf616a", "#88c0d0"],
    },
  },
  {
    id: "nord",
    name: "Polar Night",
    family: "Nord",
    scheme: "dark",
    colors: {
      bg: "#242933",
      surface: "#2e3440",
      raised: "#3b4252",
      sunken: "#20242c",
      text: "#eceff4",
      muted: "#a3acbd",
      border: "#434c5e",
      accent: "#88c0d0",
      onAccent: "#2e3440",
      success: "#a3be8c",
      warning: "#ebcb8b",
      danger: "#bf616a",
      info: "#8fbcbb",
      chart: ["#81a1c1", "#d08770", "#a3be8c", "#b48ead", "#bf616a", "#88c0d0"],
    },
  },
  {
    id: "dracula",
    name: "Dracula",
    family: "Dracula",
    scheme: "dark",
    colors: {
      bg: "#21222c",
      surface: "#282a36",
      raised: "#343746",
      sunken: "#191a21",
      text: "#f8f8f2",
      muted: "#a3acd3",
      border: "#44475a",
      accent: "#bd93f9",
      onAccent: "#21222c",
      success: "#50fa7b",
      warning: "#f1fa8c",
      danger: "#ff5555",
      info: "#8be9fd",
      chart: ["#8be9fd", "#ffb86c", "#50fa7b", "#bd93f9", "#ff79c6", "#f1fa8c"],
    },
  },
  {
    id: "gruvbox-light",
    name: "Light",
    family: "Gruvbox",
    scheme: "light",
    colors: {
      bg: "#f2e5bc",
      surface: "#fbf1c7",
      raised: "#f9f5d7",
      sunken: "#ebdbb2",
      text: "#3c3836",
      // fg3, as gray is too faint on bg0
      muted: "#665c54",
      border: "#d5c4a1",
      accent: "#af3a03",
      onAccent: "#fbf1c7",
      success: "#79740e",
      warning: "#b57614",
      danger: "#9d0006",
      info: "#076678",
      chart: ["#076678", "#af3a03", "#79740e", "#8f3f71", "#9d0006", "#427b58"],
    },
  },
  {
    id: "gruvbox-dark",
    name: "Dark",
    family: "Gruvbox",
    scheme: "dark",
    colors: {
      bg: "#1d2021",
      surface: "#282828",
      raised: "#32302f",
      sunken: "#171a1a",
      text: "#ebdbb2",
      muted: "#a89984",
      border: "#3c3836",
      accent: "#fe8019",
      onAccent: "#1d2021",
      success: "#b8bb26",
      warning: "#fabd2f",
      danger: "#fb4934",
      info: "#83a598",
      chart: ["#83a598", "#fe8019", "#b8bb26", "#d3869b", "#fb4934", "#8ec07c"],
    },
  },
  {
    id: "solarized-light",
    name: "Light",
    family: "Solarized",
    scheme: "light",
    colors: {
      bg: "#eee8d5",
      surface: "#fdf6e3",
      raised: "#fdf6e3",
      sunken: "#e6dfc8",
      text: "#073642",
      // base01, as base00 is too faint on base3
      muted: "#586e75",
      border: "#d9d2bc",
      // Blue, deepened so base3 text on it is readable
      accent: "#1b6aa5",
      onAccent: "#fdf6e3",
      success: "#859900",
      warning: "#b58900",
      danger: "#dc322f",
      info: "#2aa198",
      chart: ["#268bd2", "#cb4b16", "#859900", "#6c71c4", "#d33682", "#2aa198"],
    },
  },
  {
    id: "solarized-dark",
    name: "Dark",
    family: "Solarized",
    scheme: "dark",
    colors: {
      bg: "#00212b",
      surface: "#002b36",
      raised: "#073642",
      sunken: "#001b23",
      text: "#eee8d5",
      muted: "#93a1a1",
      border: "#0d4150",
      accent: "#2aa198",
      onAccent: "#002b36",
      success: "#859900",
      warning: "#b58900",
      danger: "#dc322f",
      info: "#268bd2",
      chart: ["#268bd2", "#cb4b16", "#859900", "#6c71c4", "#d33682", "#2aa198"],
    },
  },
];

const byId = new Map(themes.map((theme) => [theme.id, theme]));

export const defaultLightTheme: ThemeId = systemBridgeLight.id;

export const defaultDarkTheme: ThemeId = systemBridgeDark.id;

/** A theme by ID, falling back to the default for its scheme. */
export const themeById = (id: ThemeId, scheme: ColorScheme): Theme =>
  byId.get(id) ?? (scheme === "light" ? systemBridgeLight : systemBridgeDark);

/** The full name of a theme, such as "Catppuccin Mocha". */
export const themeLabel = (theme: Theme): string =>
  theme.family === theme.name ? theme.name : `${theme.family} ${theme.name}`;

/** The themes available for a colour scheme. */
export const themesFor = (scheme: ColorScheme): readonly Theme[] =>
  themes.filter((theme) => theme.scheme === scheme);

const declarations = (theme: Theme): string => {
  const { chart, ...colors } = theme.colors;

  const named = Object.entries(colors).map(
    ([key, value]) =>
      `--sb-color-${key.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)}:${value};`,
  );

  const charts = chart.map(
    (value, index) => `--sb-color-chart-${index + 1}:${value};`,
  );

  return `color-scheme:${theme.scheme};${named.join("")}${charts.join("")}`;
};

/**
 * More specific than the `:root` fallbacks in `tokens.css`, which load after
 * the theme's stylesheet and would otherwise win.
 */
const themeSelector = "html:root";

/**
 * The stylesheet for the chosen themes. In system mode both are included and
 * the browser picks one from `prefers-color-scheme`, so switching the system
 * scheme needs no script.
 */
export const themeStylesheet = (
  mode: ThemeMode,
  light: ThemeId,
  dark: ThemeId,
): string => {
  const lightTheme = themeById(light, "light");
  const darkTheme = themeById(dark, "dark");

  switch (mode) {
    case "light":
      return `${themeSelector}{${declarations(lightTheme)}}`;
    case "dark":
      return `${themeSelector}{${declarations(darkTheme)}}`;
    case "system":
      return `${themeSelector}{${declarations(lightTheme)}}@media (prefers-color-scheme: dark){${themeSelector}{${declarations(darkTheme)}}}`;
  }
};

/**
 * Where the last stylesheet is kept, so the inline script in `index.html` can
 * apply it before the first paint and a reload never flashes the wrong theme.
 */
export const themeCacheKey = "system-bridge-theme-css";

const styleElementId = "sb-theme";

/** Applies a theme stylesheet to the page, and keeps it for the next load. */
export const applyThemeStylesheet = (css: string): void => {
  let style = document.getElementById(styleElementId);

  if (!(style instanceof HTMLStyleElement)) {
    style = document.createElement("style");
    style.id = styleElementId;
    document.head.append(style);
  }

  if (style.textContent !== css) style.textContent = css;

  try {
    localStorage.setItem(themeCacheKey, css);
  } catch {
    // Storage can be unavailable, such as in a private window
  }
};
