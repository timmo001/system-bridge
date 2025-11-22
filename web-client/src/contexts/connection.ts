import { createContext } from "@lit/context";

export interface ConnectionSettings {
  host: string;
  port: number;
  ssl: boolean;
  token: string | null;
}

export const defaultConnectionSettings: ConnectionSettings = {
  host: "0.0.0.0",
  port: 9170,
  ssl: false,
  token: null,
};

export const connectionContext =
  createContext<ConnectionSettings>("connection");

const STORAGE_KEY = "system-bridge-connection";

/**
 * Load connection settings from URL query parameters
 * Returns partial settings (only params that were provided in URL)
 */
function loadConnectionSettingsFromURL(): Partial<ConnectionSettings> | null {
  try {
    const urlParams = new URLSearchParams(window.location.search);
    const hasAnyParam =
      urlParams.has("host") ||
      urlParams.has("port") ||
      urlParams.has("ssl") ||
      urlParams.has("token");

    if (!hasAnyParam) {
      return null;
    }

    const settings: Partial<ConnectionSettings> = {};

    if (urlParams.has("host")) {
      settings.host = urlParams.get("host")!;
    }

    if (urlParams.has("port")) {
      const port = parseInt(urlParams.get("port")!, 10);
      if (!isNaN(port)) {
        settings.port = port;
      }
    }

    if (urlParams.has("ssl")) {
      settings.ssl = urlParams.get("ssl") === "true";
    }

    if (urlParams.has("token")) {
      const token = urlParams.get("token")!;
      settings.token = token || null;
    }

    return settings;
  } catch {
    return null;
  }
}

export function loadConnectionSettings(): ConnectionSettings {
  // Priority 1: Check URL query parameters
  const urlSettings = loadConnectionSettingsFromURL();
  if (urlSettings) {
    // Merge URL params with defaults, then save to localStorage
    const mergedSettings = { ...defaultConnectionSettings, ...urlSettings };
    saveConnectionSettings(mergedSettings);
    return mergedSettings;
  }

  // Priority 2: Load from localStorage
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored) as ConnectionSettings;
    }
  } catch {
    // Failed to load, return default
  }

  // Priority 3: Return defaults
  return defaultConnectionSettings;
}

export function saveConnectionSettings(settings: ConnectionSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Failed to save
  }
}
