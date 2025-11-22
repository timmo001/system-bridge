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

export function loadConnectionSettings(): ConnectionSettings {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored) as ConnectionSettings;
    }
  } catch {
    // Failed to load, return default
  }
  return defaultConnectionSettings;
}

export function saveConnectionSettings(settings: ConnectionSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Failed to save
  }
}
