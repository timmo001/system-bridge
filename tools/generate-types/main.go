package main

import (
	"bytes"
	"flag"
	"fmt"
	"go/ast"
	"go/parser"
	"go/token"
	"os"
	"sort"
	"strings"
)

type ConstInfo struct {
	Name  string
	Value string
	Type  string
}

type StructInfo struct {
	Name   string
	Fields []FieldInfo
}

type FieldInfo struct {
	Name     string
	Type     string
	JSONName string
	IsArray  bool
	IsPtr    bool
	Optional bool
}

func main() {
	mode := flag.String("mode", "all", "Generation mode: modules, settings, websocket, or all")
	flag.Parse()

	switch *mode {
	case "modules":
		generateModules()
	case "settings":
		generateSettings()
	case "websocket":
		generateWebSocket()
	case "all":
		generateModules()
		generateSettings()
		generateWebSocket()
	default:
		fmt.Fprintf(os.Stderr, "Unknown mode: %s\n", *mode)
		os.Exit(1)
	}
}

func generateModules() {
	consts, err := parseConstants("types/module.go", "Module")
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error parsing module.go: %v\n", err)
		os.Exit(1)
	}

	var buf bytes.Buffer
	buf.WriteString(`import { Schema } from "effect";

// Auto-generated file. Do not edit manually.
// Generated from backend types in types/module.go

`)

	// Generate Modules array
	buf.WriteString("export const Modules = [\n")
	for _, c := range consts {
		fmt.Fprintf(&buf, "  \"%s\",\n", c.Value)
	}
	buf.WriteString("] as const;\n\n")

	// Generate ModuleNameSchema
	buf.WriteString("export const ModuleNameSchema = Schema.Union(\n")
	for _, c := range consts {
		fmt.Fprintf(&buf, "  Schema.Literal(\"%s\"),\n", c.Value)
	}
	buf.WriteString(");\n\n")

	// Generate ModuleName type
	buf.WriteString("export type ModuleName = typeof ModuleNameSchema.Type;\n\n")

	// Generate ModuleData type
	buf.WriteString("// Use a simple record type for ModuleData since we need mutability for the default\n")
	buf.WriteString("export type ModuleData = Record<ModuleName, unknown>;\n\n")

	// Generate DefaultModuleData
	buf.WriteString("export const DefaultModuleData: ModuleData = {\n")
	for _, c := range consts {
		fmt.Fprintf(&buf, "  %s: {},\n", c.Value)
	}
	buf.WriteString("};\n")

	outputFile := "web-client/src/lib/system-bridge/types-modules.ts"
	if err := os.WriteFile(outputFile, []byte(buf.String()), 0644); err != nil {
		fmt.Fprintf(os.Stderr, "Error writing output file: %v\n", err)
		os.Exit(1)
	}

	fmt.Printf("Generated types-modules.ts from types/module.go\n")
}

func generateSettings() {
	fset := token.NewFileSet()
	file, err := parser.ParseFile(fset, "settings/settings.go", nil, parser.ParseComments)
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error parsing settings.go: %v\n", err)
		os.Exit(1)
	}

	structs := make(map[string]StructInfo)
	enums := make(map[string][]ConstInfo)

	// Parse structs and enums
	for _, decl := range file.Decls {
		genDecl, ok := decl.(*ast.GenDecl)
		if !ok {
			continue
		}

		// Parse type declarations
		for _, spec := range genDecl.Specs {
			typeSpec, ok := spec.(*ast.TypeSpec)
			if !ok {
				continue
			}

			typeName := typeSpec.Name.Name

			// Check if it's a struct
			if structType, ok := typeSpec.Type.(*ast.StructType); ok {
				structInfo := StructInfo{
					Name:   typeName,
					Fields: []FieldInfo{},
				}

				for _, field := range structType.Fields.List {
					if len(field.Names) == 0 {
						continue
					}

					fieldName := field.Names[0].Name
					jsonTag := extractJSONTag(field.Tag)
					if jsonTag == "" || jsonTag == "-" {
						continue
					}

					fieldType, isArray, isPtr := parseFieldType(field.Type)
					optional := strings.Contains(field.Tag.Value, "omitempty")

					structInfo.Fields = append(structInfo.Fields, FieldInfo{
						Name:     fieldName,
						Type:     fieldType,
						JSONName: jsonTag,
						IsArray:  isArray,
						IsPtr:    isPtr,
						Optional: optional,
					})
				}

				structs[typeName] = structInfo
			}

			// Check if it's a type alias for enum
			if ident, ok := typeSpec.Type.(*ast.Ident); ok {
				if ident.Name == "string" {
					enums[typeName] = []ConstInfo{}
				}
			}
		}

		// Parse const declarations
		if genDecl.Tok == token.CONST {
			for _, spec := range genDecl.Specs {
				valueSpec, ok := spec.(*ast.ValueSpec)
				if !ok {
					continue
				}

				if len(valueSpec.Values) > 0 {
					if basicLit, ok := valueSpec.Values[0].(*ast.BasicLit); ok {
						if basicLit.Kind == token.STRING {
							for enumName := range enums {
								if len(valueSpec.Names) > 0 {
									constName := valueSpec.Names[0].Name
									if strings.HasPrefix(constName, enumName) {
										value := strings.Trim(basicLit.Value, `"`)
										enums[enumName] = append(enums[enumName], ConstInfo{
											Name:  constName,
											Value: value,
											Type:  enumName,
										})
									}
								}
							}
						}
					}
				}
			}
		}
	}

	var buf bytes.Buffer
	buf.WriteString(`import { Schema } from "effect";

// Auto-generated file. Do not edit manually.
// Generated from backend types in settings/settings.go

`)

	// Generate LogLevel enum first
	if logLevelValues, ok := enums["LogLevel"]; ok {
		buf.WriteString("export const SettingsHotkeySchema = Schema.Struct({\n")
		buf.WriteString("  name: Schema.String,\n")
		buf.WriteString("  key: Schema.String,\n")
		buf.WriteString("});\n\n")
		buf.WriteString("export type SettingsHotkey = typeof SettingsHotkeySchema.Type;\n\n")

		buf.WriteString("export const SettingsMediaDirectorySchema = Schema.Struct({\n")
		buf.WriteString("  name: Schema.String.pipe(Schema.nonEmptyString()),\n")
		buf.WriteString("  path: Schema.String.pipe(Schema.nonEmptyString()),\n")
		buf.WriteString("});\n\n")
		buf.WriteString("export type SettingsMediaDirectory = typeof SettingsMediaDirectorySchema.Type;\n\n")

		buf.WriteString("export const SettingsMediaSchema = Schema.Struct({\n")
		buf.WriteString("  directories: Schema.Array(SettingsMediaDirectorySchema),\n")
		buf.WriteString("});\n\n")
		buf.WriteString("export type SettingsMedia = typeof SettingsMediaSchema.Type;\n\n")

		buf.WriteString("export const SettingsCommandDefinitionSchema = Schema.Struct({\n")
		buf.WriteString("  id: Schema.String,\n")
		buf.WriteString("  name: Schema.String.pipe(Schema.nonEmptyString()),\n")
		buf.WriteString("  command: Schema.String.pipe(Schema.nonEmptyString()),\n")
		buf.WriteString("  workingDir: Schema.String,\n")
		buf.WriteString("  arguments: Schema.Array(Schema.String),\n")
		buf.WriteString("});\n\n")
		buf.WriteString("export type SettingsCommandDefinition = typeof SettingsCommandDefinitionSchema.Type;\n\n")

		buf.WriteString("export const SettingsCommandsSchema = Schema.Struct({\n")
		buf.WriteString("  allowlist: Schema.Array(SettingsCommandDefinitionSchema),\n")
		buf.WriteString("});\n\n")
		buf.WriteString("export type SettingsCommands = typeof SettingsCommandsSchema.Type;\n\n")

		buf.WriteString("export const SettingsSchema = Schema.Struct({\n")
		buf.WriteString("  autostart: Schema.Boolean,\n")
		buf.WriteString("  hotkeys: Schema.Array(SettingsHotkeySchema),\n")
		buf.WriteString("  logLevel: Schema.Union(\n")
		for _, val := range logLevelValues {
			fmt.Fprintf(&buf, "    Schema.Literal(\"%s\"),\n", val.Value)
		}
		buf.WriteString("  ),\n")
		buf.WriteString("  commands: SettingsCommandsSchema,\n")
		buf.WriteString("  media: SettingsMediaSchema,\n")
		buf.WriteString("});\n\n")
		buf.WriteString("export type Settings = typeof SettingsSchema.Type;\n")
	}

	outputFile := "web-client/src/lib/system-bridge/types-settings.ts"
	if err := os.WriteFile(outputFile, []byte(buf.String()), 0644); err != nil {
		fmt.Fprintf(os.Stderr, "Error writing output file: %v\n", err)
		os.Exit(1)
	}

	fmt.Printf("Generated types-settings.ts from settings/settings.go\n")
}

func generateWebSocket() {
	// Parse event types
	eventTypes, err := parseConstants("event/event_types.go", "EventType")
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error parsing event_types.go: %v\n", err)
		os.Exit(1)
	}

	// Parse response types
	responseTypes, err := parseConstants("event/response_types.go", "ResponseType")
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error parsing response_types.go: %v\n", err)
		os.Exit(1)
	}

	// Parse response subtypes
	responseSubtypes, err := parseConstants("event/response_types.go", "ResponseSubtype")
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error parsing response_types.go: %v\n", err)
		os.Exit(1)
	}

	// Parse WebSocketRequest and MessageResponse structs (for reference, but we'll hardcode the schemas)
	fset := token.NewFileSet()
	_, err = parser.ParseFile(fset, "backend/websocket/websocket.go", nil, parser.ParseComments)
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error parsing websocket.go: %v\n", err)
		os.Exit(1)
	}

	// Parse MessageResponse struct from event/event.go (for reference)
	_, err = parser.ParseFile(fset, "event/event.go", nil, parser.ParseComments)
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error parsing event.go: %v\n", err)
		os.Exit(1)
	}

	// Parse ValidateDirectoryResponseData from event/handler/validate-directory.go
	validateFile, err := parser.ParseFile(fset, "event/handler/validate-directory.go", nil, parser.ParseComments)
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error parsing validate-directory.go: %v\n", err)
		os.Exit(1)
	}

	var validateResponseStruct StructInfo
	for _, decl := range validateFile.Decls {
		genDecl, ok := decl.(*ast.GenDecl)
		if !ok {
			continue
		}

		for _, spec := range genDecl.Specs {
			typeSpec, ok := spec.(*ast.TypeSpec)
			if !ok {
				continue
			}

			typeName := typeSpec.Name.Name
			if typeName == "ValidateDirectoryResponseData" {
				if structType, ok := typeSpec.Type.(*ast.StructType); ok {
					validateResponseStruct = parseStruct(structType, typeName)
				}
			}
		}
	}

	var buf bytes.Buffer
	buf.WriteString(`import { Schema } from "effect";

import { ModuleNameSchema } from "~/lib/system-bridge/types-modules";

// Auto-generated file. Do not edit manually.
// Generated from backend types in event/ and backend/websocket/

`)

	// Generate EventTypeSchema
	buf.WriteString("export const EventTypeSchema = Schema.Union(\n")
	for _, et := range eventTypes {
		fmt.Fprintf(&buf, "  Schema.Literal(\"%s\"),\n", et.Value)
	}
	buf.WriteString(");\n\n")
	buf.WriteString("export type EventType = typeof EventTypeSchema.Type;\n\n")

	// Generate ResponseTypeSchema
	buf.WriteString("export const ResponseTypeSchema = Schema.Union(\n")
	for _, rt := range responseTypes {
		fmt.Fprintf(&buf, "  Schema.Literal(\"%s\"),\n", rt.Value)
	}
	buf.WriteString(");\n\n")
	buf.WriteString("export type ResponseType = typeof ResponseTypeSchema.Type;\n\n")

	// Generate ResponseSubtypeSchema
	buf.WriteString("export const ResponseSubtypeSchema = Schema.Union(\n")
	for _, rst := range responseSubtypes {
		fmt.Fprintf(&buf, "  Schema.Literal(\"%s\"),\n", rst.Value)
	}
	buf.WriteString(");\n\n")
	buf.WriteString("export type ResponseSubtype = typeof ResponseSubtypeSchema.Type;\n\n")

	// Generate WebSocketRequestSchema
	buf.WriteString("export const WebSocketRequestSchema = Schema.Struct({\n")
	buf.WriteString("  id: Schema.String,\n")
	buf.WriteString("  event: EventTypeSchema,\n")
	buf.WriteString("  // Request data type varies by event type\n")
	buf.WriteString("  data: Schema.optional(Schema.Unknown),\n")
	buf.WriteString("  token: Schema.String,\n")
	buf.WriteString("});\n\n")
	buf.WriteString("export type WebSocketRequest = typeof WebSocketRequestSchema.Type;\n\n")

	// Generate WebSocketResponseSchema
	buf.WriteString("export const WebSocketResponseSchema = Schema.Struct({\n")
	buf.WriteString("  id: Schema.String,\n")
	buf.WriteString("  type: ResponseTypeSchema,\n")
	buf.WriteString("  subtype: ResponseSubtypeSchema,\n")
	buf.WriteString("  // Data type varies by response type (module data, settings, command results, etc.)\n")
	buf.WriteString("  // Runtime validation is performed with specific schemas before use\n")
	buf.WriteString("  data: Schema.NullishOr(Schema.Unknown),\n")
	buf.WriteString("  message: Schema.optional(Schema.String),\n")
	buf.WriteString("  module: Schema.optional(ModuleNameSchema),\n")
	buf.WriteString("});\n\n")
	buf.WriteString("export type WebsocketResponse = typeof WebSocketResponseSchema.Type;\n\n")

	// Generate ValidateDirectoryResponseSchema
	if len(validateResponseStruct.Fields) > 0 {
		buf.WriteString("export const ValidateDirectoryResponseSchema = Schema.Struct({\n")
		for _, field := range validateResponseStruct.Fields {
			effectSchema := mapGoTypeToEffectSchema(field)
			fmt.Fprintf(&buf, "  %s: %s,\n", field.JSONName, effectSchema)
		}
		buf.WriteString("});\n\n")
		buf.WriteString("export type ValidateDirectoryResponse = typeof ValidateDirectoryResponseSchema.Type;\n")
	}

	outputFile := "web-client/src/lib/system-bridge/types-websocket.ts"
	if err := os.WriteFile(outputFile, []byte(buf.String()), 0644); err != nil {
		fmt.Fprintf(os.Stderr, "Error writing output file: %v\n", err)
		os.Exit(1)
	}

	fmt.Printf("Generated types-websocket.ts from event types\n")
}

func parseConstants(filePath, typeName string) ([]ConstInfo, error) {
	fset := token.NewFileSet()
	file, err := parser.ParseFile(fset, filePath, nil, parser.ParseComments)
	if err != nil {
		return nil, err
	}

	var consts []ConstInfo

	for _, decl := range file.Decls {
		genDecl, ok := decl.(*ast.GenDecl)
		if !ok {
			continue
		}

		if genDecl.Tok == token.CONST {
			for _, spec := range genDecl.Specs {
				valueSpec, ok := spec.(*ast.ValueSpec)
				if !ok {
					continue
				}

				if len(valueSpec.Names) > 0 && len(valueSpec.Values) > 0 {
					constName := valueSpec.Names[0].Name
					// Check if this constant belongs to the type we're looking for
					// For ModuleName, constants are like ModuleBattery, ModuleCPU, etc.
					// For EventType, constants are like EventExitApplication, EventGetData, etc.
					// For ResponseType, constants are like ResponseTypeError, etc.
					// For ResponseSubtype, constants are like ResponseSubtypeNone, etc.
					shouldInclude := false
					if typeName == "ModuleName" && strings.HasPrefix(constName, "Module") && constName != "Module" {
						shouldInclude = true
					} else if typeName == "EventType" && strings.HasPrefix(constName, "Event") {
						shouldInclude = true
					} else if typeName == "ResponseType" && strings.HasPrefix(constName, "ResponseType") {
						shouldInclude = true
					} else if typeName == "ResponseSubtype" && strings.HasPrefix(constName, "ResponseSubtype") {
						shouldInclude = true
					} else if strings.HasPrefix(constName, typeName) {
						shouldInclude = true
					}

					if shouldInclude {
						if basicLit, ok := valueSpec.Values[0].(*ast.BasicLit); ok {
							if basicLit.Kind == token.STRING {
								value := strings.Trim(basicLit.Value, `"`)
								consts = append(consts, ConstInfo{
									Name:  constName,
									Value: value,
									Type:  typeName,
								})
							}
						}
					}
				}
			}
		}
	}

	// Sort by value for consistent output
	sort.Slice(consts, func(i, j int) bool {
		return consts[i].Value < consts[j].Value
	})

	return consts, nil
}

func parseStruct(structType *ast.StructType, structName string) StructInfo {
	structInfo := StructInfo{
		Name:   structName,
		Fields: []FieldInfo{},
	}

	for _, field := range structType.Fields.List {
		if len(field.Names) == 0 {
			continue
		}

		fieldName := field.Names[0].Name
		jsonTag := extractJSONTag(field.Tag)
		if jsonTag == "" || jsonTag == "-" {
			continue
		}

		fieldType, isArray, isPtr := parseFieldType(field.Type)
		optional := strings.Contains(field.Tag.Value, "omitempty")

		structInfo.Fields = append(structInfo.Fields, FieldInfo{
			Name:     fieldName,
			Type:     fieldType,
			JSONName: jsonTag,
			IsArray:  isArray,
			IsPtr:    isPtr,
			Optional: optional,
		})
	}

	return structInfo
}

func extractJSONTag(tag *ast.BasicLit) string {
	if tag == nil {
		return ""
	}
	tagStr := strings.Trim(tag.Value, "`")
	parts := strings.Fields(tagStr)
	for _, part := range parts {
		if strings.HasPrefix(part, "json:") {
			jsonTag := strings.Trim(part[5:], `"`)
			// Handle omitempty
			if idx := strings.Index(jsonTag, ","); idx >= 0 {
				jsonTag = jsonTag[:idx]
			}
			return jsonTag
		}
	}
	return ""
}

func parseFieldType(expr ast.Expr) (string, bool, bool) {
	switch t := expr.(type) {
	case *ast.Ident:
		return t.Name, false, false
	case *ast.StarExpr:
		baseType, isArray, _ := parseFieldType(t.X)
		return baseType, isArray, true
	case *ast.ArrayType:
		elemType, _, _ := parseFieldType(t.Elt)
		return elemType, true, false
	default:
		return "unknown", false, false
	}
}

func mapGoTypeToEffectSchema(field FieldInfo) string {
	var effectSchema string

	switch field.Type {
	case "bool":
		effectSchema = "Schema.Boolean"
	case "string":
		effectSchema = "Schema.String"
	case "int", "int64", "uint64", "float64":
		effectSchema = "Schema.Number"
	default:
		effectSchema = "Schema.Unknown"
	}

	// Handle arrays
	if field.IsArray {
		effectSchema = fmt.Sprintf("Schema.Array(%s)", effectSchema)
	}

	// Handle nullable (pointer) types
	if field.IsPtr {
		effectSchema = "Schema.NullishOr(" + effectSchema + ")"
	}

	// Handle optional
	if field.Optional {
		effectSchema = "Schema.optional(" + effectSchema + ")"
	}

	return effectSchema
}
