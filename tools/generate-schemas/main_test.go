package main

import (
	"go/ast"
	"go/parser"
	"go/token"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestExtractJSONTag(t *testing.T) {
	tests := []struct {
		name     string
		tag      string
		expected string
	}{
		{
			name:     "simple json tag",
			tag:      "`json:\"field_name\"`",
			expected: "field_name",
		},
		{
			name:     "json tag with omitempty",
			tag:      "`json:\"field_name,omitempty\"`",
			expected: "field_name",
		},
		{
			name:     "json tag with dash",
			tag:      "`json:\"-\"`",
			expected: "-",
		},
		{
			name:     "empty tag",
			tag:      "",
			expected: "",
		},
		{
			name:     "tag without json",
			tag:      "`xml:\"field_name\"`",
			expected: "",
		},
		{
			name:     "multiple tags",
			tag:      "`json:\"field_name\" xml:\"other\"`",
			expected: "field_name",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			var tagLit *ast.BasicLit
			if tt.tag != "" {
				tagLit = &ast.BasicLit{Value: tt.tag}
			}
			result := extractJSONTag(tagLit)
			if result != tt.expected {
				t.Errorf("extractJSONTag() = %v, want %v", result, tt.expected)
			}
		})
	}
}

func TestParseFieldType(t *testing.T) {
	tests := []struct {
		name          string
		goCode        string
		expectedType  string
		expectedArray bool
		expectedPtr   bool
	}{
		{
			name:          "simple string",
			goCode:        "type Test struct { Field string }",
			expectedType:  "string",
			expectedArray: false,
			expectedPtr:   false,
		},
		{
			name:          "pointer to string",
			goCode:        "type Test struct { Field *string }",
			expectedType:  "string",
			expectedArray: false,
			expectedPtr:   true,
		},
		{
			name:          "array of strings",
			goCode:        "type Test struct { Field []string }",
			expectedType:  "string",
			expectedArray: true,
			expectedPtr:   false,
		},
		{
			name:          "int type",
			goCode:        "type Test struct { Field int }",
			expectedType:  "int",
			expectedArray: false,
			expectedPtr:   false,
		},
		{
			name:          "bool type",
			goCode:        "type Test struct { Field bool }",
			expectedType:  "bool",
			expectedArray: false,
			expectedPtr:   false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			fset := token.NewFileSet()
			file, err := parser.ParseFile(fset, "", "package test\n"+tt.goCode, 0)
			if err != nil {
				t.Fatalf("Failed to parse code: %v", err)
			}

			var fieldType ast.Expr
			ast.Inspect(file, func(n ast.Node) bool {
				if field, ok := n.(*ast.Field); ok && len(field.Names) > 0 {
					fieldType = field.Type
					return false
				}
				return true
			})

			if fieldType == nil {
				t.Fatal("Failed to find field type")
			}

			gotType, gotArray, gotPtr := parseFieldType(fieldType)
			if gotType != tt.expectedType || gotArray != tt.expectedArray || gotPtr != tt.expectedPtr {
				t.Errorf("parseFieldType() = (%v, %v, %v), want (%v, %v, %v)",
					gotType, gotArray, gotPtr, tt.expectedType, tt.expectedArray, tt.expectedPtr)
			}
		})
	}
}

func TestMapGoTypeToZodSchema(t *testing.T) {
	tests := []struct {
		name     string
		field    FieldInfo
		parent   string
		expected string
	}{
		{
			name: "simple string",
			field: FieldInfo{
				Name:     "Field",
				Type:     "string",
				JSONName: "field",
				IsArray:  false,
				IsPtr:    false,
			},
			parent:   "",
			expected: "z.string()",
		},
		{
			name: "nullable string",
			field: FieldInfo{
				Name:     "Field",
				Type:     "string",
				JSONName: "field",
				IsArray:  false,
				IsPtr:    true,
			},
			parent:   "",
			expected: "z.string().nullable()",
		},
		{
			name: "array of numbers",
			field: FieldInfo{
				Name:     "Field",
				Type:     "int",
				JSONName: "field",
				IsArray:  true,
				IsPtr:    false,
			},
			parent:   "",
			expected: "z.array(z.number())",
		},
		{
			name: "boolean",
			field: FieldInfo{
				Name:     "Field",
				Type:     "bool",
				JSONName: "field",
				IsArray:  false,
				IsPtr:    false,
			},
			parent:   "",
			expected: "z.boolean()",
		},
		{
			name: "nested struct",
			field: FieldInfo{
				Name:     "Field",
				Type:     "CPUData",
				JSONName: "field",
				IsArray:  false,
				IsPtr:    false,
			},
			parent:   "",
			expected: "CPUDataSchema",
		},
		{
			name: "array of structs",
			field: FieldInfo{
				Name:     "Field",
				Type:     "Process",
				JSONName: "field",
				IsArray:  true,
				IsPtr:    false,
			},
			parent:   "",
			expected: "z.array(ProcessSchema)",
		},
		{
			name: "unknown type",
			field: FieldInfo{
				Name:     "Field",
				Type:     "UnknownType",
				JSONName: "field",
				IsArray:  false,
				IsPtr:    false,
			},
			parent:   "",
			expected: "z.unknown()",
		},
		{
			name: "recursive type",
			field: FieldInfo{
				Name:     "SubHardware",
				Type:     "SensorsWindowsHardware",
				JSONName: "subhardware",
				IsArray:  true,
				IsPtr:    false,
			},
			parent:   "SensorsWindowsHardware",
			expected: "z.array(z.lazy(() => SensorsWindowsHardwareSchema))",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := mapGoTypeToZodSchema(tt.field, tt.parent)
			if result != tt.expected {
				t.Errorf("mapGoTypeToZodSchema() = %v, want %v", result, tt.expected)
			}
		})
	}
}

func TestHasRecursiveDependency(t *testing.T) {
	tests := []struct {
		name       string
		structName string
		expected   bool
	}{
		{
			name:       "SensorsWindowsHardware is recursive",
			structName: "SensorsWindowsHardware",
			expected:   true,
		},
		{
			name:       "CPUData is not recursive",
			structName: "CPUData",
			expected:   false,
		},
		{
			name:       "Other struct is not recursive",
			structName: "SomeOtherStruct",
			expected:   false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			structInfo := StructInfo{Name: tt.structName}
			structs := make(map[string]StructInfo)
			result := hasRecursiveDependency(tt.structName, structInfo, structs)
			if result != tt.expected {
				t.Errorf("hasRecursiveDependency() = %v, want %v", result, tt.expected)
			}
		})
	}
}

func TestOrderStructsByDependency(t *testing.T) {
	structs := map[string]StructInfo{
		"CPUData": {
			Name: "CPUData",
			Fields: []FieldInfo{
				{Name: "Frequency", Type: "CPUFrequency", JSONName: "frequency"},
			},
		},
		"CPUFrequency": {
			Name:   "CPUFrequency",
			Fields: []FieldInfo{},
		},
		"MemoryData": {
			Name:   "MemoryData",
			Fields: []FieldInfo{},
		},
	}

	result := orderStructsByDependency(structs)

	// CPUFrequency should come before CPUData (dependency order)
	cpuFreqIdx := -1
	cpuDataIdx := -1
	for i, name := range result {
		if name == "CPUFrequency" {
			cpuFreqIdx = i
		}
		if name == "CPUData" {
			cpuDataIdx = i
		}
	}

	if cpuFreqIdx == -1 || cpuDataIdx == -1 {
		t.Fatal("Missing expected structs in result")
	}

	if cpuFreqIdx > cpuDataIdx {
		t.Error("CPUFrequency should come before CPUData")
	}

	// All structs should be in the result
	if len(result) != len(structs) {
		t.Errorf("Expected %d structs, got %d", len(structs), len(result))
	}
}

func TestGenerateZodSchemas(t *testing.T) {
	structs := map[string]StructInfo{
		"TestData": {
			Name: "TestData",
			Fields: []FieldInfo{
				{
					Name:     "Name",
					Type:     "string",
					JSONName: "name",
					IsArray:  false,
					IsPtr:    false,
				},
				{
					Name:     "Count",
					Type:     "int",
					JSONName: "count",
					IsArray:  false,
					IsPtr:    true,
				},
			},
		},
	}

	enums := map[string]EnumInfo{
		"TestEnum": {
			Name:   "TestEnum",
			Values: []string{"value1", "value2"},
		},
	}

	result := generateZodSchemas(structs, enums)

	// Check that the result contains expected elements
	expectedElements := []string{
		"import { z } from \"zod\"",
		"Auto-generated file",
		"TestEnumSchema = z.enum([",
		`"value1"`,
		`"value2"`,
		"TestDataSchema = z.object({",
		"name: z.string()",
		"count: z.number().nullable()",
		"export type TestData",
		"export type TestEnum",
	}

	for _, expected := range expectedElements {
		if !strings.Contains(result, expected) {
			t.Errorf("Generated schema missing expected element: %s", expected)
		}
	}
}

func TestParseTypesDirectory(t *testing.T) {
	// Create a temporary directory with test Go files
	tmpDir, err := os.MkdirTemp("", "schema-test-*")
	if err != nil {
		t.Fatalf("Failed to create temp dir: %v", err)
	}
	defer os.RemoveAll(tmpDir)

	// Create test Go file
	testGoCode := `package types

type TestStruct struct {
	Name string ` + "`json:\"name\"`" + `
	Age *int ` + "`json:\"age\"`" + `
	Tags []string ` + "`json:\"tags\"`" + `
	Ignored string ` + "`json:\"-\"`" + `
}

type TestEnum string

const (
	TestEnumValue1 TestEnum = "value1"
	TestEnumValue2 TestEnum = "value2"
)
`

	testFile := filepath.Join(tmpDir, "test.go")
	if err := os.WriteFile(testFile, []byte(testGoCode), 0644); err != nil {
		t.Fatalf("Failed to write test file: %v", err)
	}

	// Parse the directory
	structs, enums, err := parseTypesDirectory(tmpDir)
	if err != nil {
		t.Fatalf("parseTypesDirectory() failed: %v", err)
	}

	// Check struct parsing
	if _, exists := structs["TestStruct"]; !exists {
		t.Error("TestStruct not found in parsed structs")
	}

	testStruct := structs["TestStruct"]
	if len(testStruct.Fields) != 3 {
		t.Errorf("Expected 3 fields (ignored field should be excluded), got %d", len(testStruct.Fields))
	}

	// Check field types
	nameField := findField(testStruct.Fields, "name")
	if nameField == nil {
		t.Fatal("name field not found")
	}
	if nameField.Type != "string" || nameField.IsPtr {
		t.Error("name field has incorrect type or pointer status")
	}

	ageField := findField(testStruct.Fields, "age")
	if ageField == nil {
		t.Fatal("age field not found")
	}
	if ageField.Type != "int" || !ageField.IsPtr {
		t.Error("age field has incorrect type or pointer status")
	}

	tagsField := findField(testStruct.Fields, "tags")
	if tagsField == nil {
		t.Fatal("tags field not found")
	}
	if tagsField.Type != "string" || !tagsField.IsArray {
		t.Error("tags field has incorrect type or array status")
	}

	// Check enum parsing
	if _, exists := enums["TestEnum"]; !exists {
		t.Error("TestEnum not found in parsed enums")
	}

	testEnum := enums["TestEnum"]
	if len(testEnum.Values) != 2 {
		t.Errorf("Expected 2 enum values, got %d", len(testEnum.Values))
	}
	if !contains(testEnum.Values, "value1") || !contains(testEnum.Values, "value2") {
		t.Error("Enum values not parsed correctly")
	}
}

func TestArrayTypeAlias(t *testing.T) {
	// Create a temporary directory with test Go files
	tmpDir, err := os.MkdirTemp("", "schema-test-array-*")
	if err != nil {
		t.Fatalf("Failed to create temp dir: %v", err)
	}
	defer os.RemoveAll(tmpDir)

	// Create test Go file with array type alias
	testGoCode := `package types

type Display struct {
	Name string ` + "`json:\"name\"`" + `
}

type DisplaysData []Display
`

	testFile := filepath.Join(tmpDir, "test.go")
	if err := os.WriteFile(testFile, []byte(testGoCode), 0644); err != nil {
		t.Fatalf("Failed to write test file: %v", err)
	}

	// Parse the directory
	structs, _, err := parseTypesDirectory(tmpDir)
	if err != nil {
		t.Fatalf("parseTypesDirectory() failed: %v", err)
	}

	// Check array type alias
	if _, exists := structs["DisplaysData"]; !exists {
		t.Fatal("DisplaysData not found in parsed structs")
	}

	displaysData := structs["DisplaysData"]
	if len(displaysData.Fields) != 1 {
		t.Errorf("Expected 1 field marker for array type, got %d", len(displaysData.Fields))
	}

	if displaysData.Fields[0].Name != "__array_element__" {
		t.Error("Array type marker not found")
	}

	if displaysData.Fields[0].Type != "Display" {
		t.Errorf("Array element type = %v, want Display", displaysData.Fields[0].Type)
	}
}

// Helper functions

func findField(fields []FieldInfo, jsonName string) *FieldInfo {
	for i := range fields {
		if fields[i].JSONName == jsonName {
			return &fields[i]
		}
	}
	return nil
}

func contains(slice []string, item string) bool {
	for _, s := range slice {
		if s == item {
			return true
		}
	}
	return false
}
