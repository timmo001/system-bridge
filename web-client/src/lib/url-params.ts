/**
 * URL query parameter parsing helpers.
 * Each returns `undefined` when the param is absent, avoiding branches at call sites.
 */

export function getStringParam(
  params: URLSearchParams,
  key: string,
): string | undefined {
  return params.has(key) ? params.get(key)! : undefined;
}

export function getIntParam(
  params: URLSearchParams,
  key: string,
): number | undefined {
  if (!params.has(key)) return undefined;
  const value = parseInt(params.get(key)!, 10);
  return isNaN(value) ? undefined : value;
}

export function getBoolParam(
  params: URLSearchParams,
  key: string,
): boolean | undefined {
  return params.has(key) ? params.get(key) === "true" : undefined;
}

/** Assign a value to a partial settings object only when defined. */
export function assignIfDefined<
  T extends Record<string, unknown>,
  K extends keyof T,
>(target: T, key: K, value: T[K] | undefined): void {
  if (value !== undefined) target[key] = value;
}

/**
 * Resolve the API token from URL params.
 * Prefers `apiKey` over `token`; converts empty strings to null.
 */
export function resolveTokenParam(
  params: URLSearchParams,
): string | null | undefined {
  const token = getStringParam(params, "apiKey") ?? getStringParam(params, "token");
  if (token === undefined) return undefined;
  return token || null;
}
