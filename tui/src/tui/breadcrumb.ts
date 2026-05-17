import { t, bold, fg } from "@opentui/core";
import type { StyledText } from "@opentui/core";
import type { Theme } from "../theme.js";

const SEPARATOR = " › ";

/**
 * Format a breadcrumb trail for subview title bars.
 *
 * - **1 part** (root): `bold(accent(parts[0]))` + optional dim subtitle
 * - **2 parts** (subview root): `dim(parts[0]) › bold(accent(parts[1]))` + optional dim subtitle
 * - **3+ parts** (nested): all but last dim-joined with ` › `, last bold accent
 *
 * @param theme - Active colour theme
 * @param parts - Breadcrumb segments, e.g. `["Dot", "Omarchy", "Theme"]`
 * @param subtitle - Optional subtitle appended after the last segment, e.g. `"repo watcher"`
 */
export function formatBreadcrumb(
  theme: Theme,
  parts: readonly string[],
  subtitle?: string,
): StyledText {
  const sub = subtitle ? fg(theme.fgMuted)(` — ${subtitle}`) : "";

  if (parts.length <= 1) {
    return t`${bold(fg(theme.accent)(parts[0] ?? ""))}${sub}`;
  }

  if (parts.length === 2) {
    return t`${fg(theme.fgMuted)(parts[0])}${fg(theme.fgSubtle)(SEPARATOR)}${bold(fg(theme.accent)(parts[1]))}${sub}`;
  }

  // 3+ parts: dim prefix joined with separators, bold last
  const prefix = parts.slice(0, -1).join(SEPARATOR);
  const last = parts[parts.length - 1];
  return t`${fg(theme.fgMuted)(prefix)}${fg(theme.fgSubtle)(SEPARATOR)}${bold(fg(theme.accent)(last))}${sub}`;
}
