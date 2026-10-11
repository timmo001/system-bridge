package main

import (
	"flag"
	"fmt"
	"go/ast"
	"go/parser"
	"go/token"
	"os"
	"path/filepath"
	"strings"
)

type StructInfo struct {
	Name   string
	Fields []FieldInfo
}

type FieldInfo struct {
	Name      string
	Type      string
	JSONName  string
	IsArray   bool
	IsPtr     bool
	OmitEmpty bool
}

type EnumInfo struct {
	Name   string
	Values []string
}

func main() {
	// Command-line flags for configuration
	typesDir := flag.String("types-dir", "types", "Directory containing Go type definitions")
	outputFile := flag.String("output", "connector/typescript/src/generated/modules.ts", "Output file for generated Effect schemas")
	flag.Parse()

	// Parse all Go files in types directory
	structs, enums, err := parseTypesDirectory(*typesDir)
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error parsing types: %v\n", err)
		os.Exit(1)
	}

	if err := os.MkdirAll(filepath.Dir(*outputFile), 0755); err != nil {
		fmt.Fprintf(os.Stderr, "Error creating output directory: %v\n", err)
		os.Exit(1)
	}

	if err := os.WriteFile(*outputFile, []byte(generateEffectSchemas(structs, enums)), 0644); err != nil {
		fmt.Fprintf(os.Stderr, "Error writing output file: %v\n", err)
		os.Exit(1)
	}

	fmt.Printf("Generated Effect schemas from %s to %s\n", *typesDir, *outputFile)
}

// moduleDataTypes maps each module name to the type of its data.
var moduleDataTypes = map[string]string{
	"battery":   "BatteryData",
	"cpu":       "CPUData",
	"disks":     "DisksData",
	"discord":   "DiscordData",
	"displays":  "DisplaysData",
	"gpus":      "GPUsData",
	"media":     "MediaData",
	"memory":    "MemoryData",
	"networks":  "NetworksData",
	"processes": "ProcessesData",
	"sensors":   "SensorsData",
	"system":    "SystemData",
}

func parseTypesDirectory(dir string) (map[string]StructInfo, map[string]EnumInfo, error) {
	structs := make(map[string]StructInfo)
	enums := make(map[string]EnumInfo)
	enumValues := make(map[string][]string)

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
							Name:      fieldName,
							Type:      fieldType,
							JSONName:  jsonTag,
							IsArray:   isArray,
							IsPtr:     isPtr,
							OmitEmpty: hasOmitEmpty(field.Tag),
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
					if elemType != "" {
						// Store the element type as a special field to mark an array alias
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

					typeIdent, ok := valueSpec.Type.(*ast.Ident)
					if !ok || len(valueSpec.Values) == 0 {
						continue
					}
					if basicLit, ok := valueSpec.Values[0].(*ast.BasicLit); ok && basicLit.Kind == token.STRING {
						enumValues[typeIdent.Name] = append(enumValues[typeIdent.Name], strings.Trim(basicLit.Value, `"`))
					}
				}
			}
		}

		return nil
	})

	// Consts can be declared in a different file from their type
	for name, enumInfo := range enums {
		enumInfo.Values = enumValues[name]
		enums[name] = enumInfo
	}

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

func hasOmitEmpty(tag *ast.BasicLit) bool {
	if tag == nil {
		return false
	}
	for _, part := range strings.Fields(strings.Trim(tag.Value, "`")) {
		if strings.HasPrefix(part, "json:") {
			options := strings.Split(strings.Trim(part[5:], `"`), ",")[1:]
			for _, option := range options {
				if option == "omitempty" {
					return true
				}
			}
		}
	}
	return false
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
