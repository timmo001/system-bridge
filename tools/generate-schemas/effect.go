package main

import (
	"bytes"
	"fmt"
	"sort"
)

// generateEffectSchemas writes an Effect Schema for every parsed enum and
// struct, each with a same-name type, plus ModuleDataSchemas.
func generateEffectSchemas(structs map[string]StructInfo, enums map[string]EnumInfo) string {
	var buf bytes.Buffer

	buf.WriteString(`// Auto-generated file. Do not edit manually.
// Generated from backend types in types/ directory

import { Schema } from "effect";

`)

	enumNames := make([]string, 0, len(enums))
	for name, enum := range enums {
		if len(enum.Values) > 0 {
			enumNames = append(enumNames, name)
		}
	}
	sort.Strings(enumNames)

	for _, name := range enumNames {
		fmt.Fprintf(&buf, "export const %s = Schema.Literals([", name)
		for i, value := range enums[name].Values {
			if i > 0 {
				buf.WriteString(", ")
			}
			fmt.Fprintf(&buf, "%q", value)
		}
		buf.WriteString("]);\n\n")
		fmt.Fprintf(&buf, "export type %s = typeof %s.Type;\n\n", name, name)
	}

	for _, name := range sortStructsTopologically(structs) {
		structInfo := structs[name]

		if isArrayAlias(structInfo) {
			fmt.Fprintf(&buf, "export const %s = Schema.Array(%s);\n\n", name, effectBaseSchema(structInfo.Fields[0].Type, "", structs, enums))
			fmt.Fprintf(&buf, "export type %s = typeof %s.Type;\n\n", name, name)
			continue
		}

		if isSelfReferencing(structInfo) {
			fmt.Fprintf(&buf, "export interface %s {\n", name)
			for _, field := range structInfo.Fields {
				optional := ""
				if field.OmitEmpty {
					optional = "?"
				}
				fmt.Fprintf(&buf, "  readonly %s%s: %s;\n", field.JSONName, optional, mapGoTypeToTypeScript(field, structs, enums))
			}
			buf.WriteString("}\n\n")
			fmt.Fprintf(&buf, "export const %s: Schema.Codec<%s> = Schema.Struct({\n", name, name)
		} else {
			fmt.Fprintf(&buf, "export const %s = Schema.Struct({\n", name)
		}

		for _, field := range structInfo.Fields {
			fmt.Fprintf(&buf, "  %s: %s,\n", field.JSONName, mapGoTypeToEffectSchema(field, name, structs, enums))
		}
		buf.WriteString("});\n")

		if !isSelfReferencing(structInfo) {
			fmt.Fprintf(&buf, "\nexport interface %s extends Schema.Schema.Type<typeof %s> {}\n", name, name)
		}
		buf.WriteString("\n")
	}

	moduleNames := make([]string, 0, len(moduleDataTypes))
	for moduleName, dataType := range moduleDataTypes {
		if _, exists := structs[dataType]; exists {
			moduleNames = append(moduleNames, moduleName)
		}
	}
	sort.Strings(moduleNames)

	buf.WriteString("export interface ModuleData {\n")
	for _, moduleName := range moduleNames {
		fmt.Fprintf(&buf, "  readonly %s: %s;\n", moduleName, moduleDataTypes[moduleName])
	}
	buf.WriteString("}\n\n")
	buf.WriteString("export type ModuleDataSchemas = {\n")
	buf.WriteString("  readonly [K in keyof ModuleData]: Schema.Decoder<ModuleData[K]>;\n")
	buf.WriteString("};\n\n")
	buf.WriteString("export const ModuleDataSchemas: ModuleDataSchemas = {\n")
	for _, moduleName := range moduleNames {
		fmt.Fprintf(&buf, "  %s: %s,\n", moduleName, moduleDataTypes[moduleName])
	}
	buf.WriteString("};\n\n")

	buf.WriteString("export const ModulesData = Schema.Struct({\n")
	for _, moduleName := range moduleNames {
		fmt.Fprintf(&buf, "  %s: Schema.optionalKey(%s),\n", moduleName, moduleDataTypes[moduleName])
	}
	buf.WriteString("});\n\n")
	buf.WriteString("export interface ModulesData extends Schema.Schema.Type<typeof ModulesData> {}\n\n")

	buf.WriteString("export const ModuleDataUpdate = Schema.Union([\n")
	for _, moduleName := range moduleNames {
		fmt.Fprintf(&buf, "  Schema.Struct({ module: Schema.Literal(%q), data: %s }),\n", moduleName, moduleDataTypes[moduleName])
	}
	buf.WriteString("]);\n\n")
	buf.WriteString("export type ModuleDataUpdate = typeof ModuleDataUpdate.Type;\n")

	return buf.String()
}

func isArrayAlias(structInfo StructInfo) bool {
	return len(structInfo.Fields) == 1 && structInfo.Fields[0].Name == "__array_element__"
}

func isSelfReferencing(structInfo StructInfo) bool {
	for _, field := range structInfo.Fields {
		if field.Type == structInfo.Name {
			return true
		}
	}
	return false
}

// sortStructsTopologically orders structs so each one follows the structs it
// references, which the generated consts need. Ties sort by name.
func sortStructsTopologically(structs map[string]StructInfo) []string {
	names := make([]string, 0, len(structs))
	for name := range structs {
		names = append(names, name)
	}
	sort.Strings(names)

	visited := make(map[string]bool, len(structs))
	result := make([]string, 0, len(structs))

	var visit func(name string)
	visit = func(name string) {
		if visited[name] {
			return
		}
		visited[name] = true
		for _, field := range structs[name].Fields {
			if _, ok := structs[field.Type]; ok && field.Type != name {
				visit(field.Type)
			}
		}
		result = append(result, name)
	}

	for _, name := range names {
		visit(name)
	}
	return result
}

func effectBaseSchema(goType string, parentStruct string, structs map[string]StructInfo, enums map[string]EnumInfo) string {
	switch goType {
	case "bool":
		return "Schema.Boolean"
	case "string":
		return "Schema.String"
	case "int", "int8", "int16", "int32", "int64", "uint", "uint8", "uint16", "uint32", "uint64", "float32", "float64":
		return "Schema.Finite"
	}
	if goType == parentStruct {
		return fmt.Sprintf("Schema.suspend((): Schema.Codec<%s> => %s)", goType, goType)
	}
	if enum, ok := enums[goType]; ok && len(enum.Values) > 0 {
		return goType
	}
	if _, ok := structs[goType]; ok {
		return goType
	}
	return "Schema.Unknown"
}

func mapGoTypeToEffectSchema(field FieldInfo, parentStruct string, structs map[string]StructInfo, enums map[string]EnumInfo) string {
	schema := effectBaseSchema(field.Type, parentStruct, structs, enums)
	if field.IsArray {
		schema = fmt.Sprintf("Schema.Array(%s)", schema)
	}
	// Go writes null for a nil pointer unless the field is omitempty
	if field.IsPtr {
		schema = fmt.Sprintf("Schema.NullOr(%s)", schema)
	}
	if field.OmitEmpty {
		schema = fmt.Sprintf("Schema.optionalKey(%s)", schema)
	}
	return schema
}

func mapGoTypeToTypeScript(field FieldInfo, structs map[string]StructInfo, enums map[string]EnumInfo) string {
	var tsType string
	switch field.Type {
	case "bool":
		tsType = "boolean"
	case "string":
		tsType = "string"
	case "int", "int8", "int16", "int32", "int64", "uint", "uint8", "uint16", "uint32", "uint64", "float32", "float64":
		tsType = "number"
	default:
		_, isStruct := structs[field.Type]
		enum, isEnum := enums[field.Type]
		if isStruct || (isEnum && len(enum.Values) > 0) {
			tsType = field.Type
		} else {
			tsType = "unknown"
		}
	}
	if field.IsArray {
		tsType = fmt.Sprintf("ReadonlyArray<%s>", tsType)
	}
	if field.IsPtr {
		tsType += " | null"
	}
	return tsType
}
