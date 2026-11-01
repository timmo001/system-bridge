import { docsConfig } from "@timmo001/docs-kit/blume";
import { defineConfig } from "blume";

export default defineConfig(
  docsConfig({
    title: "System Bridge",
    description:
      "Monitor and control your system from the web client, Home Assistant, the terminal or your own code.",
    site: "system-bridge.timmo.dev",
    github: { owner: "timmo001", repo: "system-bridge", branch: "dev" },
    navigation: {
      sidebar: [
        "/",
        {
          label: "Getting started",
          items: ["/install", "/running", "/developing"],
        },
        {
          label: "Using",
          items: [
            "/using/desktop",
            "/using/web-client",
            "/using/cli",
            "/using/home-assistant",
            "/using/omarchy",
          ],
        },
        {
          label: "Features",
          items: [
            "/features/monitoring",
            "/features/commands",
            "/features/notifications",
            "/features/media",
            "/features/remote-control",
            "/features/discord",
          ],
        },
        {
          label: "API",
          root: "/api",
          items: [
            {
              label: "HTTP",
              root: "/api/http",
              items: ["/api/status", "/api/data", "/api/media-file-data"],
            },
            {
              label: "WebSocket",
              root: "/api/websocket",
              items: [
                "/api/websocket/data",
                "/api/websocket/input",
                "/api/websocket/control",
                "/api/websocket/system",
              ],
            },
            "/api/mcp",
          ],
        },
        "/privacy",
        "/llms",
      ],
    },
    // Pages from the old site, which served the docs under /docs, and pages
    // that moved since
    redirects: [
      { from: "/overview", to: "/" },
      { from: "/docs", to: "/" },
      { from: "/docs/install", to: "/install" },
      { from: "/docs/running", to: "/running" },
      { from: "/docs/cli", to: "/using/cli" },
      { from: "/cli", to: "/using/cli" },
      { from: "/docs/api/data", to: "/api/data" },
      { from: "/docs/api/media-file-data", to: "/api/media-file-data" },
      { from: "/docs/websocket/data-get", to: "/api/websocket/data#requesting-data" },
      {
        from: "/docs/websocket/data-register-listener",
        to: "/api/websocket/data#registering-as-a-listener",
      },
      { from: "/docs/websocket/data-receive", to: "/api/websocket/data#receiving-data" },
      {
        from: "/docs/websocket/exit-application",
        to: "/api/websocket/system#exit-application",
      },
      {
        from: "/docs/websocket/keyboard-keypress",
        to: "/api/websocket/input#keyboard-keypress",
      },
      { from: "/docs/websocket/keyboard-text", to: "/api/websocket/input#keyboard-text" },
      { from: "/docs/websocket/media-control", to: "/api/websocket/control#media-control" },
      {
        from: "/docs/websocket/notification",
        to: "/api/websocket/control#send-notification",
      },
      { from: "/docs/websocket/open-path", to: "/api/websocket/control#open-a-path" },
      { from: "/docs/websocket/open-url", to: "/api/websocket/control#open-a-url" },
      { from: "/docs/websocket/power-control", to: "/api/websocket/control#power-control" },
      { from: "/websocket/overview", to: "/api/websocket" },
      { from: "/api/websocket/overview", to: "/api/websocket" },
      { from: "/websocket/data-get", to: "/api/websocket/data#requesting-data" },
      {
        from: "/websocket/data-register-listener",
        to: "/api/websocket/data#registering-as-a-listener",
      },
      { from: "/websocket/data-receive", to: "/api/websocket/data#receiving-data" },
      { from: "/websocket/exit-application", to: "/api/websocket/system#exit-application" },
      { from: "/websocket/keyboard-keypress", to: "/api/websocket/input#keyboard-keypress" },
      { from: "/websocket/keyboard-text", to: "/api/websocket/input#keyboard-text" },
      { from: "/websocket/media-control", to: "/api/websocket/control#media-control" },
      { from: "/websocket/notification", to: "/api/websocket/control#send-notification" },
      { from: "/websocket/open-path", to: "/api/websocket/control#open-a-path" },
      { from: "/websocket/open-url", to: "/api/websocket/control#open-a-url" },
      { from: "/websocket/power-control", to: "/api/websocket/control#power-control" },
      { from: "/websocket/filesystem", to: "/api/websocket/system#files--directories" },
      { from: "/websocket/settings", to: "/api/websocket/system#settings" },
      { from: "/websocket/command-execute", to: "/api/websocket/system#execute-command" },
    ],
  }),
);
