# Schema Generator

Automatically generates Zod schemas for the web client from Go struct definitions in the backend.

## Overview

This tool parses Go struct definitions in the `types/` directory and generates corresponding TypeScript Zod schemas in `web-client/src/lib/system-bridge/types-modules-schemas.ts`.

This ensures type safety between the backend and frontend by keeping them in sync automatically.

## How It Works

The generator:

1. **Parses Go Files**: Reads all `.go` files in the `types/` directory
2. **Extracts Structs**: Identifies struct definitions and their fields using Go's AST parser
3. **Maps Types**: Converts Go types to Zod schemas:
   - `*bool`, `*string`, `*int`, `*float64` → `z.boolean().nullable()`, `z.string().nullable()`, etc.
   - `[]Type` → `z.array(TypeSchema)`
   - Nested structs → References to other schemas
   - Enums → `z.enum([...])`
4. **Handles Special Cases**:
   - Recursive structs (like `SensorsWindowsHardware`)
   - Type aliases for arrays (like `type DisplaysData = []Display`)
5. **Generates ModuleDataSchemas**: Creates the mapping object for all data modules

## Usage

### Automatic (Recommended)

The generator runs automatically during the build process:

```bash
make build               # Runs generate_schemas before building
make build_web_client    # Runs generate_schemas before building web client
```

### Manual

To manually regenerate the schemas:

```bash
make generate_schemas    # Using Makefile
# OR
go run tools/generate-schemas/main.go
```

## Type Mapping

| Go Type | Zod Schema |
|---------|------------|
| `bool` | `z.boolean()` |
| `*bool` | `z.boolean().nullable()` |
| `string` | `z.string()` |
| `*string` | `z.string().nullable()` |
| `int`, `int64`, `uint64`, `float64` | `z.number()` |
| `*int`, `*float64`, etc. | `z.number().nullable()` |
| `[]Type` | `z.array(TypeSchema)` |
| `NestedStruct` | `NestedStructSchema` |
| Enum (const strings) | `z.enum(["value1", "value2"])` |

## Adding New Types

When you add new struct definitions to the `types/` directory:

1. Define your struct with JSON tags:
```go
type MyData struct {
    Field1 string  `json:"field_1"`
    Field2 *int64  `json:"field_2"`
}
```

2. Run the generator:
```bash
make generate_schemas
```

3. The Zod schema will be automatically created:
```typescript
export const MyDataSchema = z.object({
  field_1: z.string(),
  field_2: z.number().nullable(),
});

export type MyData = z.infer<typeof MyDataSchema>;
```

## Important Notes

- **Do not edit** `types-modules-schemas.ts` manually - it's auto-generated
- JSON tags must be present on all fields you want exported
- The generator preserves the order of dependencies (simple types before complex)
- Recursive types are handled specially (see `SensorsWindowsHardware`)
- Array type aliases (e.g., `type FooData = []Foo`) are supported

## Troubleshooting

### Schema not generated for my type

- Ensure the struct has a JSON tag on each field
- Check that the file is in the `types/` directory
- Verify the struct name follows conventions (e.g., ends with `Data` for module data types)

### Type validation failing

- Regenerate schemas: `make generate_schemas`
- Check TypeScript errors: `cd web-client && pnpm typecheck`
- Ensure Go struct matches the data being sent from backend
