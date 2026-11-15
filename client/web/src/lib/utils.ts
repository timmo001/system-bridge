const CLIENT_ID_KEY = "system-bridge-client-id";

/** This browser's own id, made once and kept. */
export function browserClientId(): string {
  let id = localStorage.getItem(CLIENT_ID_KEY);

  if (id === null) {
    id = generateUUID();
    localStorage.setItem(CLIENT_ID_KEY, id);
  }

  return id;
}

/** What the user agent names, first match wins, as [marker, name]. */
const browsers = [
  ["Firefox/", "Firefox"],
  ["Edg/", "Edge"],
  ["Chrome/", "Chrome"],
  ["Safari/", "Safari"],
] as const;

const systems = [
  ["Android", "Android"],
  ["iPhone", "iOS"],
  ["iPad", "iOS"],
  ["Windows", "Windows"],
  ["Mac OS", "macOS"],
  ["Linux", "Linux"],
] as const;

/** A name for this browser in the devices list, such as "Firefox on Linux". */
export const browserName = () => {
  const named = (list: readonly (readonly [string, string])[]) =>
    list.find(([marker]) => navigator.userAgent.includes(marker))?.[1];

  const browser = named(browsers) ?? "A browser";
  const system = named(systems);

  return system === undefined ? browser : `${browser} on ${system}`;
};

export function generateUUID(): string {
  // crypto.randomUUID() requires secure context (HTTPS or localhost)
  // Fallback for HTTP connections
  if (globalThis.crypto && "randomUUID" in globalThis.crypto) {
    return crypto.randomUUID();
  }

  // Fallback UUID v4 generator
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    // oxlint-disable-next-line no-bitwise
    const r = (Math.random() * 16) | 0;
    // oxlint-disable-next-line no-bitwise
    const v = c === "x" ? r : (r & 0x3) | 0x8;

    return v.toString(16);
  });
}
