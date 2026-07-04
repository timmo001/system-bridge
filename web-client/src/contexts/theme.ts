import { createContext } from "@lit/context";

export type Theme = "light" | "dark" | "system";

export interface ThemeState {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

export const themeContext = createContext<ThemeState>("theme");

const STORAGE_KEY = "system-bridge-theme";

export function loadTheme(): Theme {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "light" || stored === "dark" || stored === "system") {
      return stored;
    }
  } catch (error) {
    console.error("Failed to load theme from localStorage:", error);
  }
  return "system";
}

export function saveTheme(theme: Theme): void {
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch (error) {
    console.error("Failed to save theme to localStorage:", error);
  }
}

export function getEffectiveTheme(theme: Theme): "light" | "dark" {
  if (theme === "system") {
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  }
  return theme;
}

export function applyTheme(theme: "light" | "dark"): void {
  if (theme === "dark") {
    document.documentElement.classList.add("dark");
  } else {
    document.documentElement.classList.remove("dark");
  }
}
