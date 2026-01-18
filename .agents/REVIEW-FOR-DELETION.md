# Instructions Flagged for Review/Deletion

This document identifies instructions from the original AGENTS.md that may be redundant, too vague, or overly obvious.

## Redundant (Agent Already Knows This)

These instructions describe standard practices that AI agents already follow:

1. **"Use meaningful variable names"** - This is basic programming practice
2. **"Keep functions focused and small"** - Standard software engineering principle
3. **"Use early returns to reduce nesting depth"** - Common pattern agents already use
4. **"Prefer well-maintained packages with active communities"** - Obvious best practice
5. **"Check license compatibility"** - Standard due diligence
6. **"Keep dependencies updated"** - General security advice

## Too Vague to Be Actionable

These instructions lack specificity:

1. **"Validate all external input"** - Needs specific validation rules for the project
2. **"Use parameterized queries"** - Only relevant if/when database is added (currently not used)

## Overly Obvious

1. **"Never commit secrets"** - Universal rule, not specific to this project
2. **"Test error conditions, not just happy paths"** - Basic testing principle

## Potentially Redundant File Naming Rules

The file naming conventions are standard for Go and TypeScript ecosystems:
- Go: `lowercase.go` with `_test.go` suffix
- TypeScript: kebab-case for components
- These could be removed as they follow language conventions

## Recommendations

**Consider removing:** All items listed above as they don't add value beyond what agents already know.

**Keep:** All project-specific rules such as:
- "Always use Makefile (not direct `go build`)"
- "Run `go fmt ./...` after editing Go code"
- "Never edit `types-modules-schemas.ts` - it's auto-generated"
- OS-specific code pattern with build tags
- Specific error handling patterns for this codebase
- Token authentication architecture
- Chrome DevTools MCP testing workflow

These are truly unique to your project and provide actionable guidance.
