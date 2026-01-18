# Platform Support

## Supported Platforms

- **Supported OS**: Linux (prioritize Arch/Ubuntu), Windows (latest), macOS (experimental)
- **CPU architectures**: Intel/AMD/Apple Silicon only, no legacy/32-bit

## Command Examples by Platform

When documenting or providing commands, use these package managers:

- **Windows**: Use modern PowerShell, winget
- **Linux**: Provide pacman (Arch) and apt (Debian/Ubuntu) examples
- **macOS**: Use Homebrew

When adding external dependencies, document installation steps in README.md with per-OS commands.

## Security Considerations

- **Never commit secrets** (tokens, API keys, passwords)
- All API endpoints require token authentication
- Validate all external input
- Use parameterized queries (if/when database is added)
- Keep dependencies updated
