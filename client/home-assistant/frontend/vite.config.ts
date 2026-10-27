import { defineConfig } from "vite";

// Home Assistant loads a dashboard resource as one file, so Lit is bundled in
// and nothing is split into chunks
export default defineConfig({
  build: {
    outDir: "dist",
    emptyOutDir: true,
    target: "es2022",
    lib: {
      entry: "src/index.ts",
      formats: ["es"],
      fileName: () => "system-bridge-dashboard.js",
    },
  },
});
