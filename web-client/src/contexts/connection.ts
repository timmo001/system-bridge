import { createContext } from "@lit/context";

import {
  assignIfDefined,
  getBoolParam,
  getIntParam,
  getStringParam,
  resolveTokenParam,
} from "../lib/url-params";

export interface ConnectionSettings {
  host: string;
  port: number;
  ssl: boolean;
  token: string | null;
}

const defaultConnectionSettings: ConnectionSettings = {
  host: "0.0.0.0",
  port: 9170,
  ssl: false,
  token: null,
};

export const connectionContext =
  createContext<ConnectionSettings>("connection");

const STORAGE_KEY = "system-bridge-connection";

/**
 * Load connection settings from URL query parameters.
 * Returns partial settings (only params that were provided in URL),
 * or null if no connection params are present.
 */
function loadConnectionSettingsFromURL(): Partial<ConnectionSettings> | null {
  try {
    const params = new URLSearchParams(window.location.search);
    const settings: Partial<ConnectionSettings> = {};

    assignIfDefined(settings, "host", getStringParam(params, "host"));
    assignIfDefined(settings, "port", getIntParam(params, "port"));
    assignIfDefined(settings, "ssl", getBoolParam(params, "ssl"));
    assignIfDefined(settings, "token", resolveTokenParam(params));

    return Object.keys(settings).length > 0 ? settings : null;
  } catch (error) {
    console.error("Error loading connection settings from URL", error);
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
  } catch (error) {
    console.error("Error loading connection settings from localStorage", error);
  }

  // Priority 3: Return defaults
  return defaultConnectionSettings;
}

export function saveConnectionSettings(settings: ConnectionSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch (error) {
    console.error("Error saving connection settings to localStorage", error);
  }
}
