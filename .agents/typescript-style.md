# TypeScript/Lit Code Style

## Component Structure

Follow Lit component patterns consistently:

```typescript
import { html } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { UIElement } from "~/mixins";

@customElement("my-component")
export class MyComponent extends UIElement {
  // Public properties (attributes)
  @property() variant: "default" | "primary" = "default";
  @property({ type: Boolean }) disabled = false;

  // Internal state
  @state() private _internalValue = "";

  connectedCallback() {
    super.connectedCallback();
    // Setup lifecycle
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    // Cleanup
  }

  render() {
    return html`
      <div class="${this.variant}">
        <slot></slot>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "my-component": MyComponent;
  }
}
```

## Type Safety

- **Never use `any`** - it's configured as an error in ESLint
- Use `type` imports for type-only imports: `import type { MyType } from "./types"`
- Leverage Zod for runtime validation and type inference
- Define explicit return types for public methods

```typescript
// Good: Explicit types
function processData(input: DataInput): DataOutput {
  // ...
}

// Good: Type imports
import type { CPUData, ModuleData } from "~/lib/system-bridge/types-modules";

// Bad: Using any
function processData(input: any): any {  // ESLint error
  // ...
}
```

## Naming Conventions

From ESLint configuration:
- **Variables**: `camelCase`, `UPPER_CASE` (constants), or `PascalCase` (components)
- **Types/Interfaces**: `PascalCase`
- **Functions/Methods**: `camelCase`
- **Private members**: Prefix with `_` (e.g., `_handleClick`, `_internalValue`)
- **Custom elements**: Use kebab-case tags (e.g., `ui-button`, `theme-provider`)

### File Naming

- **TypeScript**: `kebab-case.ts` for components, `camelCase.ts` for utilities

## Import Organization

ESLint enforces import ordering:

```typescript
// 1. Built-in modules (if any)
import { Context } from "@lit/context";

// 2. External modules
import { html } from "lit";
import { customElement } from "lit/decorators.js";

// 3. Internal modules
import { UIElement } from "~/mixins";
import { theme } from "~/contexts/theme";
```

Always maintain alphabetical ordering within each group.

## Accessibility

- Always include appropriate ARIA attributes for interactive elements
- Use semantic HTML elements
- Provide keyboard event handlers for click events
- Include alt text for images
- Ensure proper focus management

```typescript
// Good: Accessible button
this.setAttribute("role", "button");
this.tabIndex = 0;
this.setAttribute("aria-disabled", this.disabled ? "true" : "false");

// Good: Keyboard support
this.addEventListener("keydown", (e) => {
  if (e.key === "Enter" || e.key === " ") {
    this._handleClick();
  }
});
```

## Performance Considerations

- **Lazy load** heavy components
- **Debounce** frequent updates (WebSocket messages, resize events)
- **Virtual scrolling** for long lists
- Use `@state` sparingly; prefer deriving computed values in `render()`
- Minimize re-renders by carefully managing reactive properties

## Linting and Formatting

```bash
cd web-client

# Run linter
pnpm lint

# Fix linting errors automatically
pnpm lint:fix

# Type checking
pnpm typecheck

# Format checking (Prettier)
pnpm format:check

# Format automatically (Prettier)
pnpm format:write
```

**Important:** Prettier is the formatter, ESLint is the TypeScript linter. They serve different purposes.

## Common ESLint Issues

```bash
# Auto-fix what's possible
pnpm lint:fix

# For persistent errors, check:
# 1. Import order (must follow prescribed groups)
# 2. Naming conventions (camelCase, PascalCase, etc.)
# 3. No 'any' types (always provide explicit types)
```
