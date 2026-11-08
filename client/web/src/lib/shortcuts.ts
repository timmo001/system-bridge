import { Schema } from "effect";

import { inApp, mobile } from "./mobile";
import { type NavItem, navigation } from "./navigation";

/** A page for a launcher shortcut: its path, label and `@mdi/js` icon. */
const ShortcutPage = Schema.Struct({
  path: Schema.String,
  label: Schema.String,
  icon: Schema.String,
});

interface ShortcutPage extends Schema.Schema.Type<typeof ShortcutPage> {}

const pageJson = Schema.encodeSync(Schema.toCodecJson(ShortcutPage));

const pageOf = ({ href, label, icon }: NavItem): ShortcutPage => ({
  path: href,
  label,
  icon,
});

/** Overview, Media, Processes and System, until visits say otherwise. */
const startingIds = new Set([
  "overview",
  "module-media",
  "module-processes",
  "module-system",
]);

const startingPages = navigation
  .flatMap((section) => section.items)
  .filter((item) => startingIds.has(item.id))
  .map((item) => pageJson(pageOf(item)));

/**
 * Tells the Android app about a visit to a page, which it counts towards
 * the long-press shortcuts to the pages used most. Does nothing outside it.
 */
export const visitPage = (item: NavItem): void => {
  if (!inApp) return;

  void mobile.then((current) =>
    current.call("visitPage", Schema.Boolean, {
      page: pageJson(pageOf(item)),
      defaults: startingPages,
    }),
  );
};

/**
 * Asks the Android app to pin a page on this computer to the home screen:
 * false where the launcher can't.
 */
export const pinPage = async (page: ShortcutPage): Promise<boolean> =>
  (await mobile).call("pinPage", Schema.Boolean, pageJson(page));
