import { Schema } from "effect";

import {
  assignIfDefined,
  getBoolParam,
  getIntParam,
  getStringParam,
  resolveTokenParam,
} from "./url-params";

const ConnectionSettings = Schema.Struct({
  host: Schema.String,
  port: Schema.Finite,
  ssl: Schema.Boolean,
  token: Schema.NullOr(Schema.String),
});

export interface ConnectionSettings extends Schema.Schema.Type<
  typeof ConnectionSettings
> {}

const decodeStoredSettings = Schema.decodeUnknownSync(
  Schema.fromJsonString(ConnectionSettings),
);

/**
 * Where to connect before anything is saved. A built client is served by
 * System Bridge itself, so it starts with the server it came from; the dev
 * server isn't System Bridge, so it starts with the usual local backend.
 */
const defaultConnectionSettings: ConnectionSettings = import.meta.env.DEV
  ? { host: "localhost", port: 9170, ssl: false, token: null }
  : {
      host: location.hostname,
      port:
        Number(location.port) || (location.protocol === "https:" ? 443 : 80),
      ssl: location.protocol === "https:",
      token: null,
    };

const STORAGE_KEY = "system-bridge-connection";

/**
 * Load connection settings from URL query parameters.
 * Returns partial settings (only params that were provided in URL),
 * or null if no connection params are present.
 */
function loadConnectionSettingsFromURL(): Partial<ConnectionSettings> | null {
  try {
    const params = new URLSearchParams(window.location.search);

    const settings: {
      -readonly [K in keyof ConnectionSettings]?: ConnectionSettings[K];
    } = {};

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
      return decodeStoredSettings(stored);
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
