import { BrowserKeyValueStore } from "@effect/platform-browser";
import { Schema } from "effect";
import { Atom } from "effect/reactivity";

import {
  applyThemeStylesheet,
  defaultDarkTheme,
  defaultLightTheme,
  ThemeId,
  ThemeMode,
  themeStylesheet,
} from "./themes";

const storage = Atom.runtime(BrowserKeyValueStore.layerLocalStorage);

export const Appearance = Schema.Struct({
  mode: ThemeMode,
  /** The theme used when the scheme is light. */
  light: ThemeId,
  /** The theme used when the scheme is dark. */
  dark: ThemeId,
});

export interface Appearance extends Schema.Schema.Type<typeof Appearance> {}

const isThemeMode = Schema.is(ThemeMode);

/** The mode the previous web client saved, so upgrading keeps it. */
const legacyMode = (): ThemeMode => {
  try {
    const stored = localStorage.getItem("system-bridge-theme");

    return isThemeMode(stored) ? stored : "system";
  } catch {
    return "system";
  }
};

/** The colour scheme and themes, kept in the browser. */
export const appearance = Atom.kvs({
  runtime: storage,
  key: "system-bridge-appearance",
  schema: Appearance,
  defaultValue: (): Appearance => ({
    mode: legacyMode(),
    light: defaultLightTheme,
    dark: defaultDarkTheme,
  }),
}).pipe(Atom.keepAlive);

/** Applies the chosen themes to the page whenever they change. */
export const appliedTheme = Atom.make((get) => {
  const { mode, light, dark } = get(appearance);
  const css = themeStylesheet(mode, light, dark);

  applyThemeStylesheet(css);

  return css;
}).pipe(Atom.keepAlive);
