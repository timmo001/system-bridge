/**
 * The web UI's WebMCP tools: `show-module` and `filter-processes`, which
 * change what the user is looking at. Media, windows, audio and displays stay
 * in the MCP server. The theme tools come from `pageTheme`. Nothing registers
 * in a browser without `document.modelContext`.
 */
import type {
  ModelContextTool,
  ToolArguments,
  ToolResult,
} from "@timmo001/groundwork-tokens/webmcp";
import { ModuleName } from "@timmo001/effect-system-bridge";
import { Result, Schema } from "effect";

import { moduleInfo } from "./navigation";
import { DataView, href, navigate, SortOrder } from "./router";

const text = (message: string): ToolResult => ({
  content: [{ type: "text", text: message }],
});

const ProcessColumn = Schema.Literals([
  "name",
  "id",
  "cpu",
  "memory",
  "status",
  "user",
  "path",
]);

const ShowInput = Schema.Struct({
  module: ModuleName,
  view: Schema.optionalKey(DataView),
});

const FilterInput = Schema.Struct({
  search: Schema.optionalKey(Schema.String),
  sort: Schema.optionalKey(ProcessColumn),
  order: Schema.optionalKey(SortOrder),
});

const showModule: ModelContextTool = {
  name: "show-module",
  description:
    "Show the user a module's page, such as cpu, memory or processes, as its dashboard or its raw JSON.",
  inputSchema: {
    type: "object",
    properties: {
      module: { type: "string", enum: ModuleName.literals },
      view: {
        type: "string",
        enum: DataView.literals,
        description: "dashboard (the default) or json",
      },
    },
    required: ["module"],
  },
  execute: (input: ToolArguments) => {
    const decoded = Schema.decodeUnknownResult(ShowInput)(input);

    if (Result.isFailure(decoded)) {
      return Promise.resolve(
        text(`Give one of these modules: ${ModuleName.literals.join(", ")}`),
      );
    }

    const { module, view } = decoded.success;

    navigate(
      href("module", {
        params: { module },
        search: view === "json" ? { view } : {},
      }),
    );

    return Promise.resolve(text(`Showing ${moduleInfo[module].label}`));
  },
};

const filterProcesses: ModelContextTool = {
  name: "filter-processes",
  description:
    "Search and sort the process list the user is looking at, and show it. An empty search shows every process.",
  inputSchema: {
    type: "object",
    properties: {
      search: {
        type: "string",
        description: "Words in a process's name, user, status or path",
      },
      sort: { type: "string", enum: ProcessColumn.literals },
      order: { type: "string", enum: SortOrder.literals },
    },
  },
  execute: (input: ToolArguments) => {
    const decoded = Schema.decodeUnknownResult(FilterInput)(input);

    if (Result.isFailure(decoded)) {
      return Promise.resolve(
        text(`Those settings aren't valid: ${String(decoded.failure)}`),
      );
    }

    const { search, sort, order } = decoded.success;

    navigate(
      href("module", {
        params: { module: "processes" },
        search: {
          q: search === "" ? undefined : search,
          sort,
          order,
        },
      }),
    );

    return Promise.resolve(
      text(`Showing processes with ${JSON.stringify(decoded.success)}`),
    );
  },
};

/** Registers the tools. Returns whether the browser offered WebMCP. */
export const registerPageTools = (): boolean => {
  const context = document.modelContext;

  if (context === undefined) return false;

  for (const tool of [showModule, filterProcesses]) {
    void context.registerTool(tool);
  }

  return true;
};
