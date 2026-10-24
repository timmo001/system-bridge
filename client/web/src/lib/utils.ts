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
