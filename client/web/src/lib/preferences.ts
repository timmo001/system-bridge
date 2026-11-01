import { BrowserKeyValueStore } from "@effect/platform-browser";
import { Schema } from "effect";
import { Atom } from "effect/reactivity";

const storage = Atom.runtime(BrowserKeyValueStore.layerLocalStorage);

export const HistoryRange = Schema.Literals(["1h", "6h", "24h"]);

export type HistoryRange = typeof HistoryRange.Type;

/** How far back the graphs show, shared by every graph. */
export const historyRange = Atom.kvs({
  runtime: storage,
  key: "system-bridge-history-range",
  schema: HistoryRange,
  defaultValue: (): HistoryRange => "1h",
}).pipe(Atom.keepAlive);

/** The media player picked on the Media page, or null for the backend's pick. */
export const mediaPlayer = Atom.kvs({
  runtime: storage,
  key: "system-bridge-media-player",
  schema: Schema.NullOr(Schema.String),
  defaultValue: (): string | null => null,
}).pipe(Atom.keepAlive);
