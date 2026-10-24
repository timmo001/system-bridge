---
title: Docs for agents
description: Give an agent these docs as llms.txt, a page's Markdown, or a docs MCP server it can search.
---

These docs are published in forms an agent can read directly, so it can answer questions about System Bridge or write code against it.

| URL | Use |
| --- | --- |
| [`/llms.txt`](https://system-bridge.timmo.dev/llms.txt) | An index of every page, so the agent can pick what it needs |
| [`/llms-full.txt`](https://system-bridge.timmo.dev/llms-full.txt) | Every page in one file |
| `/{page}.md` | One page as Markdown, such as [`/features/commands.md`](https://system-bridge.timmo.dev/features/commands.md) |
| [`/mcp`](https://system-bridge.timmo.dev/mcp) | An MCP server for these docs, with search, page and navigation tools |

They're generated from the docs when the site is built, so they always match it.

## Docs MCP server

Connect an agent to `https://system-bridge.timmo.dev/mcp` with the Streamable HTTP transport. It has `search_docs`, `get_page`, `list_pages` and `get_navigation` tools, and needs no token. For example, with Claude Code:

```bash
claude mcp add --transport http system-bridge-docs https://system-bridge.timmo.dev/mcp
```

Each page's menu also has **Connect to MCP**, with the setup for Claude Code, Codex, Cursor and VS Code, and actions to copy the page as Markdown or open it in a chat.

## The docs MCP server and System Bridge's MCP server

The docs MCP server only reads these docs. System Bridge's own [MCP server](/api/mcp) runs on your machine and lets an agent read live data and control it. Use both to have an agent that knows how System Bridge works and can use it.
