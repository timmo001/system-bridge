import { defineConfig } from "vite";
import { resolve } from "path";

export default defineConfig({
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
