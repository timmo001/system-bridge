import { headTags, writePwa } from "@timmo001/groundwork-pwa/build";
import { themeBootScript } from "@timmo001/groundwork-tokens/page";
import { build, defineConfig } from "vite";
import { resolve } from "path";

import pwaConfig from "./pwa.config";
import { themeOptions } from "./src/lib/theme-options";

const outDir = resolve(import.meta.dirname, "dist");

export default defineConfig({
  plugins: [
    {
      // Apply the stored theme before the first paint, so a reload never
      // flashes the wrong colours
      name: "theme-boot",
      transformIndexHtml: () => [
        {
          tag: "script",
          children: themeBootScript(themeOptions),
          injectTo: "head-prepend",
        },
      ],
    },
    {
      // The manifest link and the browser bar's colours for each mode
      name: "pwa-head",
      transformIndexHtml: (html) =>
        html.replace(
          "</head>",
          `  ${headTags(pwaConfig, "/manifest.webmanifest")}\n  </head>`,
        ),
    },
    {
      // The manifest, and the service worker as one classic script, as it's
      // registered without `type: "module"` and can't import chunks
      name: "pwa-build",
      apply: "build",
      closeBundle: async () => {
        await writePwa(pwaConfig, { outDir });
        await build({
          configFile: false,
          logLevel: "warn",
          define: { SW_VERSION: JSON.stringify(Date.now().toString(36)) },
          build: {
            outDir,
            emptyOutDir: false,
            copyPublicDir: false,
            sourcemap: true,
            lib: {
              entry: resolve(import.meta.dirname, "src/sw.ts"),
              formats: ["iife"],
              name: "systemBridgeWorker",
              fileName: () => "sw.js",
            },
          },
        });
      },
    },
  ],
  build: {
    outDir,
    emptyOutDir: true,
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: undefined,
      },
    },
  },
  resolve: {
    // The connector is built from source, so its Effect imports resolve to its
    // own install. Bundle one copy: the connection hangs with two
    dedupe: ["effect", "@effect/platform-browser"],
    alias: {
      "~": resolve(import.meta.dirname, "./src"),
      // Build the workspace connector from source, so it needs no build first
      "@timmo001/effect-system-bridge": resolve(
        import.meta.dirname,
        "../../connector/typescript/src/index.ts",
      ),
    },
  },
});
