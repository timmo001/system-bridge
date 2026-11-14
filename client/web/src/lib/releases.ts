import { Effect, Schema } from "effect";
import { HttpClientRequest } from "effect/http";
import { Atom } from "effect/reactivity";

import { connectionSettings } from "./atoms";
import { decodeBody, send } from "./backend";

/** A System Bridge release and its notes, as `GET /api/releases` answers it. */
export const Release = Schema.Struct({
  version: Schema.String,
  name: Schema.String,
  publishedAt: Schema.String,
  url: Schema.String,
  /** The release notes, in Markdown. */
  notes: Schema.String,
  /** Whether it's newer than the computer's version. */
  newer: Schema.Boolean,
  /** Whether it's the computer's version. */
  installed: Schema.Boolean,
});

export interface Release extends Schema.Schema.Type<typeof Release> {}

/** The newest releases, and the version the computer has. */
export const Releases = Schema.Struct({
  version: Schema.String,
  releases: Schema.Array(Release),
  /** The page listing every release. */
  more: Schema.String,
});

export interface Releases extends Schema.Schema.Type<typeof Releases> {}

const repository = "https://github.com/timmo001/system-bridge";

/**
 * Links the bare `#123` references in release notes to their pull request or
 * issue, as GitHub does on the release's own page. GitHub sends issue links
 * on to the pull request when that's what the number is.
 */
export const linkReferences = (notes: string) =>
  notes.replace(
    /(^|[\s(,])#(\d+)\b/g,
    (_, before: string, number: string) =>
      `${before}[#${number}](${repository}/issues/${number})`,
  );

/** The newest releases and their notes, from the computer. */
export const releases = Atom.make((get) =>
  send(get(connectionSettings), HttpClientRequest.get("/api/releases")).pipe(
    Effect.flatMap(decodeBody(Releases)),
  ),
);
