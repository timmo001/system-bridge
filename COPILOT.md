### GitHub Copilot Repository Rules

Use the shared rules under `.cursor/rules/` as the single source of truth for AI assistant guidance. Copilot should follow the same policies.

Authoritative rules:
- ./.cursor/rules/project.mdc
- ./.cursor/rules/build-with-makefile.mdc
- ./.cursor/rules/workflows.mdc
- ./.cursor/rules/platform-support.mdc
- ./.cursor/rules/go-format.mdc
- ./.cursor/rules/v4-migration.mdc

Highlights for suggestions:
- Use `make` targets for build/test/package; do not invoke toolchains directly.
- Match supported platform/CPU policy.
- Ensure Go files are formatted after edits.


