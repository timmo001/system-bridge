import recommended from "@timmo001/oxlint-rules/configs/recommended";
import { defineConfig } from "oxlint";

export default defineConfig({
  extends: [recommended],
  ignorePatterns: [
    ".blume/**",
    ".blume-verify/**",
    "dist/**",
    "node_modules/**",
    "oxlint.config.ts",
  ],
  // No typeCheck: the .astro module types only exist once Blume has generated
  // .blume/, so it would fail on a fresh checkout
  options: {
    typeAware: true,
    maxWarnings: 0,
  },
});
