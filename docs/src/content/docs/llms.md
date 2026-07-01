---
title: LLMs
description: Feed the System Bridge documentation to an agent using llms.txt.
---

The System Bridge documentation is published in formats that an agent can read directly, following the [llms.txt](https://llmstxt.org) convention. Point an agent at one of these files to give it the docs as context.

## Available files

- [`/llms.txt`](https://system-bridge.timmo.dev/llms.txt) - an index of the documentation with links to each section. Use this when you want the agent to pick what it needs.
- [`/llms-full.txt`](https://system-bridge.timmo.dev/llms-full.txt) - the entire documentation in a single file. Use this for the most complete context.
- [`/llms-small.txt`](https://system-bridge.timmo.dev/llms-small.txt) - a trimmed version for smaller context windows.

These files are generated from the docs at build time, so they stay in sync with the rest of the site.

## How to use them

- Paste one of the URLs above into an agent and ask it to read the page.
- Use the actions in the page header on any docs page to copy the page as Markdown, then paste it straight into an agent. This gives the agent the content directly, so it does not need to fetch the page over the web.

## Relationship to MCP

`llms.txt` gives an agent the documentation. The [MCP server](/api/mcp/) goes further and lets an agent read live system data and control your machine over the [Model Context Protocol](https://modelcontextprotocol.io). Use `llms.txt` to help an agent understand System Bridge, and the MCP server to let it act on your system.
