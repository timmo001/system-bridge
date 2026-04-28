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
