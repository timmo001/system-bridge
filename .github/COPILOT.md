### GitHub Copilot Repository Rules

This repository centralizes AI assistant rules under `.cursor/rules/`. GitHub Copilot should apply those same rules. Treat the files below as the single source of truth and follow them when suggesting code, commands, and docs.

- ../.cursor/rules/project.mdc
- ../.cursor/rules/build-with-makefile.mdc
- ../.cursor/rules/workflows.mdc
- ../.cursor/rules/platform-support.mdc
- ../.cursor/rules/go-format.mdc
- ../.cursor/rules/v4-migration.mdc

Key highlights for Copilot suggestions:
- Use `make` targets for build/test/package; avoid invoking toolchains directly.
- Keep platform guidance aligned with supported OS/CPU policy.
- For Go code, ensure files are formatted after edits.


