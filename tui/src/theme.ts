import { Effect } from "effect";

/** Semantic colour tokens for the TUI */
export interface Theme {
  /** App background */
  readonly bg: string;
  /** Elevated surface (pane/card background) */
  readonly bgElevated: string;
  /** Selected row background (subtle accent tint) */
  readonly bgSelected: string;
  /** Focused input background */
  readonly bgInput: string;
  /** Accent colour for selections, highlights, cursors, and emphasis text */
  readonly accent: string;
  /** Contrasting text colour for content rendered on the accent background */
  readonly accentFg: string;
  /** Secondary surface (separators, secondary selection background) */
  readonly surface: string;
  /** Primary foreground text */
  readonly fg: string;
  /** Muted secondary text */
  readonly fgMuted: string;
  /** Dim text for subtle UI elements */
  readonly fgSubtle: string;
  /** Dimmest text for ghost-level elements */
  readonly fgGhost: string;
  /** Success state */
  readonly green: string;
  /** Error state */
  readonly red: string;
  /** Warning / in-progress state */
  readonly yellow: string;
  /** Whether panels should skip painting backgrounds to let terminal transparency through */
  readonly transparent: boolean;
}

/** Catppuccin Mocha (dark) theme */
export const theme: Theme = {
  bg: "#06060a",
  bgElevated: "#0e0e15",
  bgSelected: "#1a1a2e",
  bgInput: "#181825",
  accent: "#89b4fa",
  accentFg: "#11111b",
  surface: "#313244",
  fg: "#cdd6f4",
  fgMuted: "#a6adc8",
  fgSubtle: "#6c7086",
  fgGhost: "#45475a",
  green: "#a6e3a1",
  red: "#f38ba8",
  yellow: "#f9e2af",
  transparent: false,
};

/** Theme as an Effect — composable in the entry point via `yield* loadTheme` */
export const loadTheme: Effect.Effect<Theme> = Effect.succeed(theme);
