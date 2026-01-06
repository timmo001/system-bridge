package main

import (
	"bytes"
	"flag"
	"fmt"
	"go/ast"
	"go/parser"
	"go/token"
	"os"
	"path/filepath"
	"sort"
	"strings"
)

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
}

type EnumInfo struct {
	Name   string
	Values []string
}

func main() {
	// Command-line flags for configuration
	typesDir := flag.String("types-dir", "types", "Directory containing Go type definitions")
	outputFile := flag.String("output", "web-client/src/lib/system-bridge/types-modules-schemas.ts", "Output file for generated TypeScript schemas")
	flag.Parse()

	// Parse all Go files in types directory
	structs, enums, err := parseTypesDirectory(*typesDir)
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error parsing types: %v\n", err)
		os.Exit(1)
	}

	// Generate TypeScript/Effect Schema schemas
	tsCode := generateEffectSchemas(structs, enums)

	// Write to output file
	if err := os.WriteFile(*outputFile, []byte(tsCode), 0644); err != nil {
		fmt.Fprintf(os.Stderr, "Error writing output file: %v\n", err)
		os.Exit(1)
	}

	fmt.Printf("Generated Effect schemas from %s to %s\n", *typesDir, *outputFile)
}

func parseTypesDirectory(dir string) (map[string]StructInfo, map[string]EnumInfo, error) {
	structs := make(map[string]StructInfo)
	enums := make(map[string]EnumInfo)

	fset := token.NewFileSet()

	err := filepath.Walk(dir, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}
		if !strings.HasSuffix(path, ".go") {
			return nil
		}

		// Parse the Go file
		file, err := parser.ParseFile(fset, path, nil, parser.ParseComments)
		if err != nil {
			return fmt.Errorf("parsing %s: %w", path, err)
		}

		// Extract structs and enums
		for _, decl := range file.Decls {
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

						structInfo.Fields = append(structInfo.Fields, FieldInfo{
							Name:     fieldName,
							Type:     fieldType,
							JSONName: jsonTag,
							IsArray:  isArray,
							IsPtr:    isPtr,
						})
					}

					structs[typeName] = structInfo
				}

				// Check if it's a type alias
				if ident, ok := typeSpec.Type.(*ast.Ident); ok {
					if ident.Name == "string" {
						// This might be an enum, store it
						enums[typeName] = EnumInfo{
							Name:   typeName,
							Values: []string{},
						}
					}
				}

				// Check if it's an array type alias (e.g., type DisplaysData = []Display)
				if arrayType, ok := typeSpec.Type.(*ast.ArrayType); ok {
					elemType, _, _ := parseFieldType(arrayType.Elt)
					// Create a pseudo-struct to represent the array
					structs[typeName] = StructInfo{
						Name:   typeName,
						Fields: []FieldInfo{}, // Empty fields indicates it's an array type
						// We'll use a special marker in the name or add a flag later if needed
					}
					// Store the element type in a comment or another way
					// For now, we'll handle this in the schema generation
					if elemType != "" {
						// Store as a special field to indicate array type
						structs[typeName] = StructInfo{
							Name: typeName,
							Fields: []FieldInfo{
								{
									Name:     "__array_element__",
									Type:     elemType,
									JSONName: "",
									IsArray:  true,
									IsPtr:    false,
								},
							},
						}
					}
				}
			}

			// Look for const declarations (enum values)
			if genDecl.Tok == token.CONST {
				for _, spec := range genDecl.Specs {
					valueSpec, ok := spec.(*ast.ValueSpec)
					if !ok {
						continue
					}

					if len(valueSpec.Values) > 0 {
						if basicLit, ok := valueSpec.Values[0].(*ast.BasicLit); ok {
							if basicLit.Kind == token.STRING {
								// Find which enum this belongs to
								for enumName, enumInfo := range enums {
									if len(valueSpec.Names) > 0 {
										constName := valueSpec.Names[0].Name
										if strings.HasPrefix(constName, enumName) {
											value := strings.Trim(basicLit.Value, `"`)
											enumInfo.Values = append(enumInfo.Values, value)
											enums[enumName] = enumInfo
										}
									}
								}
							}
						}
					}
				}
			}
		}

		return nil
	})

	return structs, enums, err
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

func generateEffectSchemas(structs map[string]StructInfo, enums map[string]EnumInfo) string {
	var buf bytes.Buffer

	buf.WriteString(`import { Schema } from "effect";

// Auto-generated file. Do not edit manually.
// Generated from backend types in types/ directory

`)

	// Determine the order of structs (dependencies first)
	orderedStructs := orderStructsByDependency(structs)

	// Generate enum schemas first
	enumNames := make([]string, 0, len(enums))
	for name := range enums {
		enumNames = append(enumNames, name)
	}
	sort.Strings(enumNames)

	for _, name := range enumNames {
		enum := enums[name]
		if len(enum.Values) > 0 {
			fmt.Fprintf(&buf, "// %s enum\n", name)
			if len(enum.Values) == 1 {
				fmt.Fprintf(&buf, "export const %sSchema = Schema.Literal(\"%s\");\n", name, enum.Values[0])
			} else {
				fmt.Fprintf(&buf, "export const %sSchema = Schema.Union(\n", name)
				for _, value := range enum.Values {
					fmt.Fprintf(&buf, "  Schema.Literal(\"%s\"),\n", value)
				}
				buf.WriteString(");\n")
			}
			fmt.Fprintf(&buf, "export type %s = typeof %sSchema.Type;\n\n", name, name)
		}
	}

	// Generate struct schemas
	for _, name := range orderedStructs {
		structInfo := structs[name]
		comment := getStructComment(name)

		fmt.Fprintf(&buf, "// %s\n", comment)

		// Check if this struct has recursive dependencies
		if hasRecursiveDependency(name, structInfo, structs) {
			generateRecursiveEffectSchema(&buf, structInfo)
		} else {
			generateNormalEffectSchema(&buf, structInfo, enums)
		}
	}

	// Generate ModuleDataSchemas map
	buf.WriteString("// Module Data Union Type\n")
	buf.WriteString("export const ModuleDataSchemas = {\n")

	moduleDataTypes := map[string]string{
		"battery":   "BatteryData",
		"cpu":       "CPUData",
		"disks":     "DisksData",
		"displays":  "DisplaysData",
		"gpus":      "GPUsData",
		"media":     "MediaData",
		"memory":    "MemoryData",
		"networks":  "NetworksData",
		"processes": "ProcessesData",
		"sensors":   "SensorsData",
		"system":    "SystemData",
	}

	// Sort module names for consistent output
	moduleNames := make([]string, 0, len(moduleDataTypes))
	for name := range moduleDataTypes {
		moduleNames = append(moduleNames, name)
	}
	sort.Strings(moduleNames)

	for _, moduleName := range moduleNames {
		dataType := moduleDataTypes[moduleName]
		if _, exists := structs[dataType]; exists {
			fmt.Fprintf(&buf, "  %s: %sSchema,\n", moduleName, dataType)
		}
	}

	buf.WriteString("} as const;\n")

	return buf.String()
}

func getStructComment(name string) string {
	comments := map[string]string{
		"BatteryData":            "Battery Module",
		"CPUData":                "CPU Module",
		"DisksData":              "Disks Module",
		"DisplaysData":           "Displays Module",
		"GPUsData":               "GPUs Module",
		"MediaData":              "Media Module",
		"MemoryData":             "Memory Module",
		"NetworksData":           "Networks Module",
		"ProcessesData":          "Processes Module",
		"SensorsData":            "Sensors Module",
		"SystemData":             "System Module",
		"CPUFrequency":           "CPU Frequency",
		"CPUStats":               "CPU Stats",
		"CPUTimes":               "CPU Times",
		"PerCPU":                 "Per-CPU Data",
		"DiskIOCounters":         "Disk IO Counters",
		"DiskUsage":              "Disk Usage",
		"DiskPartition":          "Disk Partition",
		"Disk":                   "Disk",
		"Display":                "Display",
		"GPU":                    "GPU",
		"MemorySwap":             "Memory Swap",
		"MemoryVirtual":          "Memory Virtual",
		"NetworkAddress":         "Network Address",
		"NetworkStats":           "Network Stats",
		"NetworkConnection":      "Network Connection",
		"NetworkIO":              "Network IO",
		"Network":                "Network",
		"Process":                "Process",
		"SensorsWindowsSensor":   "Windows Sensor",
		"SensorsWindowsHardware": "Windows Hardware",
		"SensorsNVIDIAChipset":   "NVIDIA Chipset",
		"SensorsNVIDIADisplay":   "NVIDIA Display",
		"SensorsNVIDIADriver":    "NVIDIA Driver",
		"SensorsNVIDIAGPU":       "NVIDIA GPU",
		"SensorsNVIDIA":          "NVIDIA Sensors",
		"SensorsWindows":         "Windows Sensors",
		"Temperature":            "Temperature Sensor",
		"SystemUser":             "System User",
	}

	if comment, exists := comments[name]; exists {
		return comment
	}
	return name
}

func hasRecursiveDependency(name string, structInfo StructInfo, structs map[string]StructInfo) bool {
	// Check if SensorsWindowsHardware (has recursive subhardware field)
	return name == "SensorsWindowsHardware"
}

func generateRecursiveEffectSchema(buf *bytes.Buffer, structInfo StructInfo) {
	// For SensorsWindowsHardware with recursive structure
	// Effect Schema requires explicit type annotation for recursive schemas
	// Use interface instead of type per eslint rules
	fmt.Fprintf(buf, "export interface %s {\n", structInfo.Name)

	for _, field := range structInfo.Fields {
		tsType := mapGoTypeToTypeScript(field, structInfo.Name)
		fmt.Fprintf(buf, "  readonly %s: %s;\n", field.JSONName, tsType)
	}

	buf.WriteString("}\n\n")

	fmt.Fprintf(buf, "export const %sSchema: Schema.Schema<%s> = Schema.Struct({\n", structInfo.Name, structInfo.Name)

	for i, field := range structInfo.Fields {
		effectSchema := mapGoTypeToEffectSchema(field, structInfo.Name)
		fmt.Fprintf(buf, "  %s: %s", field.JSONName, effectSchema)
		if i < len(structInfo.Fields)-1 {
			buf.WriteString(",\n")
		} else {
			buf.WriteString(",\n")
		}
	}

	buf.WriteString("});\n\n")
}

func generateNormalEffectSchema(buf *bytes.Buffer, structInfo StructInfo, enums map[string]EnumInfo) {
	// Check if this is an array type alias
	if len(structInfo.Fields) == 1 && structInfo.Fields[0].Name == "__array_element__" {
		elemType := structInfo.Fields[0].Type
		elemSchema := elemType + "Schema"
		fmt.Fprintf(buf, "export const %sSchema = Schema.Array(%s);\n\n", structInfo.Name, elemSchema)
		fmt.Fprintf(buf, "export type %s = typeof %sSchema.Type;\n\n", structInfo.Name, structInfo.Name)
		return
	}

	fmt.Fprintf(buf, "export const %sSchema = Schema.Struct({\n", structInfo.Name)

	for i, field := range structInfo.Fields {
		effectSchema := mapGoTypeToEffectSchema(field, "")
		fmt.Fprintf(buf, "  %s: %s", field.JSONName, effectSchema)
		if i < len(structInfo.Fields)-1 {
			buf.WriteString(",\n")
		} else {
			buf.WriteString(",\n")
		}
	}

	buf.WriteString("});\n\n")
	fmt.Fprintf(buf, "export type %s = typeof %sSchema.Type;\n\n", structInfo.Name, structInfo.Name)
}

func mapGoTypeToTypeScript(field FieldInfo, parentStruct string) string {
	var tsType string

	switch field.Type {
	case parentStruct:
		tsType = "readonly " + parentStruct + "[]"
	case "SensorsWindowsSensor":
		tsType = "readonly SensorsWindowsSensor[]"
	case "bool":
		tsType = "boolean"
	case "string":
		tsType = "string"
	case "int", "int64", "uint64", "float64":
		tsType = "number"
	default:
		if strings.HasSuffix(field.Type, "Data") ||
			strings.HasPrefix(field.Type, "CPU") ||
			strings.HasPrefix(field.Type, "Disk") ||
			strings.HasPrefix(field.Type, "Display") ||
			strings.HasPrefix(field.Type, "GPU") ||
			strings.HasPrefix(field.Type, "Memory") ||
			strings.HasPrefix(field.Type, "Network") ||
			strings.HasPrefix(field.Type, "Process") ||
			strings.HasPrefix(field.Type, "Sensors") ||
			strings.HasPrefix(field.Type, "System") ||
			strings.HasPrefix(field.Type, "Temperature") {
			tsType = field.Type
		} else {
			tsType = "unknown"
		}
	}

	if field.IsArray && !strings.HasPrefix(tsType, "readonly ") {
		tsType = "readonly " + tsType + "[]"
	}

	if field.IsPtr {
		tsType += " | null | undefined"
	}

	return tsType
}

func mapGoTypeToEffectSchema(field FieldInfo, parentStruct string) string {
	var effectSchema string

	// Handle recursive reference for SensorsWindowsHardware
	if parentStruct == "SensorsWindowsHardware" && field.Type == "SensorsWindowsHardware" {
		effectSchema = "Schema.Array(Schema.suspend((): Schema.Schema<SensorsWindowsHardware> => SensorsWindowsHardwareSchema))"
		if field.IsPtr {
			effectSchema = "Schema.NullishOr(" + effectSchema + ")"
		}
		return effectSchema
	}

	// Map Go type to Effect Schema
	baseSchema := ""

	switch field.Type {
	case "bool":
		baseSchema = "Schema.Boolean"
	case "string":
		baseSchema = "Schema.String"
	case "int", "int64", "uint64", "float64":
		baseSchema = "Schema.Number"
	case "RunMode":
		baseSchema = "Schema.Literal(\"standalone\")"
	default:
		// Check if it's a defined struct
		if strings.HasSuffix(field.Type, "Data") ||
			strings.HasPrefix(field.Type, "CPU") ||
			strings.HasPrefix(field.Type, "Disk") ||
			strings.HasPrefix(field.Type, "Display") ||
			strings.HasPrefix(field.Type, "GPU") ||
			strings.HasPrefix(field.Type, "Memory") ||
			strings.HasPrefix(field.Type, "Network") ||
			strings.HasPrefix(field.Type, "Process") ||
			strings.HasPrefix(field.Type, "Sensors") ||
			strings.HasPrefix(field.Type, "System") ||
			strings.HasPrefix(field.Type, "Temperature") {
			baseSchema = field.Type + "Schema"
		} else {
			baseSchema = "Schema.Unknown"
		}
	}

	// Handle arrays
	if field.IsArray {
		effectSchema = fmt.Sprintf("Schema.Array(%s)", baseSchema)
	} else {
		effectSchema = baseSchema
	}

	// Handle nullable (pointer) types
	// Use Schema.NullishOr to match Go's pointer semantics and TypeScript behavior:
	// - In Go, pointer fields (*T) can be nil, representing an "absent" or "not set" value
	// - In TypeScript/JSON, this maps to either `null` (explicitly absent) or `undefined` (not present)
	// - Schema.NullishOr allows both null and undefined (matches TypeScript's optional/nullable types)
	// This ensures generated Effect schemas correctly validate TypeScript types where optional fields
	// can be either undefined (field not present in JSON) or explicitly set to null
	if field.IsPtr {
		effectSchema = "Schema.NullishOr(" + effectSchema + ")"
	}

	return effectSchema
}

func orderStructsByDependency(structs map[string]StructInfo) []string {
	// Define a custom order based on dependencies
	order := []string{
		// Enums first
		"RunMode",

		// Simple structs without dependencies
		"CPUFrequency",
		"CPUStats",
		"CPUTimes",
		"DiskIOCounters",
		"DiskUsage",
		"NetworkAddress",
		"NetworkStats",
		"NetworkIO",
		"Temperature",
		"SystemUser",
		"MemorySwap",
		"MemoryVirtual",

		// Structs with simple dependencies
		"PerCPU",
		"DiskPartition",
		"NetworkConnection",
		"SensorsWindowsSensor",
		"SensorsNVIDIAChipset",
		"SensorsNVIDIADisplay",
		"SensorsNVIDIADriver",
		"SensorsNVIDIAGPU",

		// Structs with nested dependencies
		"Disk",
		"Display",
		"GPU",
		"Network",
		"Process",
		"SensorsNVIDIA",

		// Recursive struct
		"SensorsWindowsHardware",
		"SensorsWindows",

		// Top-level data structs
		"BatteryData",
		"CPUData",
		"DisksData",
		"DisplaysData",
		"GPUsData",
		"MediaData",
		"MemoryData",
		"NetworksData",
		"ProcessesData",
		"SensorsData",
		"SystemData",
	}

	// Filter to only include structs that exist
	result := []string{}
	for _, name := range order {
		if _, exists := structs[name]; exists {
			result = append(result, name)
		}
	}

	// Add any structs that weren't in the predefined order
	for name := range structs {
		found := false
		for _, ordered := range result {
			if ordered == name {
				found = true
				break
			}
		}
		if !found {
			result = append(result, name)
		}
	}

	return result
}
