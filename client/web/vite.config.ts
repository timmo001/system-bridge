import { defineConfig } from "vite";
import { resolve } from "path";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [tailwindcss()],
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
      "~": resolve(__dirname, "./src"),
      // Build the workspace connector from source, so it needs no build first
      "@timmo001/effect-system-bridge": resolve(
        __dirname,
        "../../connector/typescript/src/index.ts",
      ),
    },
  },
});
