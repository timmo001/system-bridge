import recommendedEffect from "@timmo001/oxlint-rules/configs/recommended-effect";
import { defineConfig } from "oxlint";

export default defineConfig({
  extends: [recommendedEffect],
  ignorePatterns: ["dist/**", "node_modules/**", "*.config.*"],
  options: {
    typeAware: true,
    typeCheck: true,
    maxWarnings: 0,
  },
});
