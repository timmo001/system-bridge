import { themeBootScript } from "@timmo001/groundwork-tokens/page";
import { defineConfig } from "vite";
import { resolve } from "path";

import { themeOptions } from "./src/lib/theme-options";

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
  ],
  build: {
    outDir: "dist",
    emptyOutDir: true,
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: undefined,
      },
    },
  },
  resolve: {
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
