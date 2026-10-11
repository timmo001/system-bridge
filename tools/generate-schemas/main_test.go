package main

import (
	"go/ast"
	"go/parser"
	"go/token"
	"os"
	"path/filepath"
	"slices"
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

func TestHasOmitEmpty(t *testing.T) {
	tests := []struct {
		name     string
		tag      string
		expected bool
	}{
		{name: "no options", tag: "`json:\"field\"`", expected: false},
		{name: "omitempty", tag: "`json:\"field,omitempty\"`", expected: true},
		{name: "other option", tag: "`json:\"field,string\"`", expected: false},
		{name: "omitempty on another key", tag: "`xml:\"field,omitempty\" json:\"field\"`", expected: false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if result := hasOmitEmpty(&ast.BasicLit{Value: tt.tag}); result != tt.expected {
				t.Errorf("hasOmitEmpty() = %v, want %v", result, tt.expected)
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

func TestMapGoTypeToEffectSchema(t *testing.T) {
	tests := []struct {
		name     string
		field    FieldInfo
		parent   string
		expected string
	}{
		{
			name:     "simple string",
			field:    FieldInfo{Name: "Field", Type: "string", JSONName: "field"},
			expected: "Schema.String",
		},
		{
			name:     "nullable string",
			field:    FieldInfo{Name: "Field", Type: "string", JSONName: "field", IsPtr: true},
			expected: "Schema.NullOr(Schema.String)",
		},
		{
			name:     "array of numbers",
			field:    FieldInfo{Name: "Field", Type: "int", JSONName: "field", IsArray: true},
			expected: "Schema.Array(Schema.Finite)",
		},
		{
			name:     "boolean",
			field:    FieldInfo{Name: "Field", Type: "bool", JSONName: "field"},
			expected: "Schema.Boolean",
		},
		{
			name:     "nested struct",
			field:    FieldInfo{Name: "Field", Type: "CPUData", JSONName: "field"},
			expected: "CPUData",
		},
		{
			name:     "array of structs",
			field:    FieldInfo{Name: "Field", Type: "Process", JSONName: "field", IsArray: true},
			expected: "Schema.Array(Process)",
		},
		{
			name:     "enum",
			field:    FieldInfo{Name: "RunMode", Type: "RunMode", JSONName: "run_mode"},
			expected: "RunMode",
		},
		{
			name:     "unknown type",
			field:    FieldInfo{Name: "Field", Type: "UnknownType", JSONName: "field"},
			expected: "Schema.Unknown",
		},
		{
			name:     "omitempty",
			field:    FieldInfo{Name: "Field", Type: "string", JSONName: "field", OmitEmpty: true},
			expected: "Schema.optionalKey(Schema.String)",
		},
		{
			name:     "recursive type",
			field:    FieldInfo{Name: "SubHardware", Type: "SensorsWindowsHardware", JSONName: "subhardware", IsArray: true},
			parent:   "SensorsWindowsHardware",
			expected: "Schema.Array(Schema.suspend((): Schema.Codec<SensorsWindowsHardware> => SensorsWindowsHardware))",
		},
	}

	// UnknownType is intentionally absent so it falls back to Schema.Unknown.
	knownStructs := map[string]StructInfo{
		"CPUData":                {Name: "CPUData"},
		"Process":                {Name: "Process"},
		"SensorsWindowsHardware": {Name: "SensorsWindowsHardware"},
	}
	knownEnums := map[string]EnumInfo{
		"RunMode": {Name: "RunMode", Values: []string{"standalone"}},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := mapGoTypeToEffectSchema(tt.field, tt.parent, knownStructs, knownEnums)
			if result != tt.expected {
				t.Errorf("mapGoTypeToEffectSchema() = %v, want %v", result, tt.expected)
			}
		})
	}
}

func TestSortStructsTopologically(t *testing.T) {
	structs := map[string]StructInfo{
		"A": {Name: "A", Fields: []FieldInfo{{Name: "C", Type: "C", JSONName: "c"}}},
		"B": {Name: "B"},
		"C": {Name: "C", Fields: []FieldInfo{{Name: "B", Type: "B", JSONName: "b"}}},
		"D": {Name: "D", Fields: []FieldInfo{{Name: "D", Type: "D", JSONName: "d", IsArray: true}}},
	}

	result := sortStructsTopologically(structs)
	expected := []string{"B", "C", "A", "D"}
	if !slices.Equal(result, expected) {
		t.Errorf("sortStructsTopologically() = %v, want %v", result, expected)
	}
}

func TestGenerateEffectSchemas(t *testing.T) {
	structs := map[string]StructInfo{
		"TestData": {
			Name: "TestData",
			Fields: []FieldInfo{
				{Name: "Name", Type: "string", JSONName: "name"},
				{Name: "Count", Type: "int", JSONName: "count", IsPtr: true},
				{Name: "Mode", Type: "TestEnum", JSONName: "mode"},
			},
		},
		"TestTree": {
			Name: "TestTree",
			Fields: []FieldInfo{
				{Name: "Children", Type: "TestTree", JSONName: "children", IsArray: true},
			},
		},
		"BatteryData": {
			Name:   "BatteryData",
			Fields: []FieldInfo{{Name: "Percentage", Type: "float64", JSONName: "percentage", IsPtr: true}},
		},
	}

	enums := map[string]EnumInfo{
		"TestEnum": {Name: "TestEnum", Values: []string{"value1", "value2"}},
	}

	result := generateEffectSchemas(structs, enums)

	expectedElements := []string{
		"Auto-generated file",
		`import { Schema } from "effect";`,
		`export const TestEnum = Schema.Literals(["value1", "value2"]);`,
		"export type TestEnum = typeof TestEnum.Type;",
		"export const TestData = Schema.Struct({",
		"name: Schema.String,",
		"count: Schema.NullOr(Schema.Finite),",
		"mode: TestEnum,",
		"export interface TestData extends Schema.Schema.Type<typeof TestData> {}",
		"export interface TestTree {",
		"readonly children: ReadonlyArray<TestTree>;",
		"export const TestTree: Schema.Codec<TestTree> = Schema.Struct({",
		"readonly battery: BatteryData;",
		"battery: BatteryData,",
		"battery: Schema.optionalKey(BatteryData),",
		`Schema.Struct({ module: Schema.Literal("battery"), data: BatteryData }),`,
	}

	for _, expected := range expectedElements {
		if !strings.Contains(result, expected) {
			t.Errorf("Generated schema missing expected element: %s", expected)
		}
	}

	if strings.Contains(result, "cpu:") || strings.Contains(result, `"cpu"`) {
		t.Error("module schemas should only list modules whose data type was parsed")
	}
}

func TestParseTypesDirectory(t *testing.T) {
	tmpDir := t.TempDir()

	testGoCode := `package types

type TestStruct struct {
	Name string ` + "`json:\"name\"`" + `
	Age *int ` + "`json:\"age\"`" + `
	Tags []string ` + "`json:\"tags,omitempty\"`" + `
	Ignored string ` + "`json:\"-\"`" + `
}

type TestEnum string

const (
	TestEnumValue1 TestEnum = "value1"
	TestEnumValue2 TestEnum = "value2"
)

type ModuleName string

const (
	ModuleBattery ModuleName = "battery"
	ModuleCPU     ModuleName = "cpu"
	Untyped                  = "ignored"
)
`

	if err := os.WriteFile(filepath.Join(tmpDir, "test.go"), []byte(testGoCode), 0644); err != nil {
		t.Fatalf("Failed to write test file: %v", err)
	}

	structs, enums, err := parseTypesDirectory(tmpDir)
	if err != nil {
		t.Fatalf("parseTypesDirectory() failed: %v", err)
	}

	testStruct, exists := structs["TestStruct"]
	if !exists {
		t.Fatal("TestStruct not found in parsed structs")
	}
	if len(testStruct.Fields) != 3 {
		t.Errorf("Expected 3 fields (ignored field should be excluded), got %d", len(testStruct.Fields))
	}

	nameField := findField(testStruct.Fields, "name")
	if nameField == nil {
		t.Fatal("name field not found")
	}
	if nameField.Type != "string" || nameField.IsPtr || nameField.OmitEmpty {
		t.Error("name field has incorrect type, pointer or omitempty status")
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
	if tagsField.Type != "string" || !tagsField.IsArray || !tagsField.OmitEmpty {
		t.Error("tags field has incorrect type, array or omitempty status")
	}

	if values := enums["TestEnum"].Values; !slices.Equal(values, []string{"value1", "value2"}) {
		t.Errorf("TestEnum values = %v, want [value1 value2]", values)
	}

	// Const names don't share the type's name, so values match by declared type
	if values := enums["ModuleName"].Values; !slices.Equal(values, []string{"battery", "cpu"}) {
		t.Errorf("ModuleName values = %v, want [battery cpu]", values)
	}
}

func TestArrayTypeAlias(t *testing.T) {
	tmpDir := t.TempDir()

	testGoCode := `package types

type Display struct {
	Name string ` + "`json:\"name\"`" + `
}

type DisplaysData []Display
`

	if err := os.WriteFile(filepath.Join(tmpDir, "test.go"), []byte(testGoCode), 0644); err != nil {
		t.Fatalf("Failed to write test file: %v", err)
	}

	structs, _, err := parseTypesDirectory(tmpDir)
	if err != nil {
		t.Fatalf("parseTypesDirectory() failed: %v", err)
	}

	displaysData, exists := structs["DisplaysData"]
	if !exists {
		t.Fatal("DisplaysData not found in parsed structs")
	}
	if !isArrayAlias(displaysData) {
		t.Fatal("DisplaysData should be an array alias")
	}
	if displaysData.Fields[0].Type != "Display" {
		t.Errorf("Array element type = %v, want Display", displaysData.Fields[0].Type)
	}
}

func findField(fields []FieldInfo, jsonName string) *FieldInfo {
	for i := range fields {
		if fields[i].JSONName == jsonName {
			return &fields[i]
		}
	}
	return nil
}
