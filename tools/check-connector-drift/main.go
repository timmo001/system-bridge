// Compares the Python and TypeScript connectors with the backend, for a
// release: the events, replies, error subtypes and modules each connector
// knows, whether its client sends or handles each one, and the fields of the
// models written by hand. The TypeScript module data schemas are generated, so
// `mise run drift:connectors` regenerates them and checks they're unchanged.
package main

import (
	"fmt"
	"go/ast"
	"go/parser"
	"go/token"
	"maps"
	"os"
	"path/filepath"
	"reflect"
	"regexp"
	"slices"
	"strconv"
	"strings"
)

const (
	tsProtocol   = "connector/typescript/src/protocol.ts"
	tsClient     = "connector/typescript/src/websocket.ts"
	pyModels     = "connector/python/systembridgeconnector/models"
	pyConst      = "connector/python/systembridgeconnector/const.py"
	pyModules    = "connector/python/systembridgeconnector/models/modules/__init__.py"
	pyClient     = "connector/python/systembridgeconnector/websocket_client.py"
	pyModuleEnum = "Module"
)

// Replies the clients don't need to wait for or handle, with why.
var unhandledReplies = map[string]string{
	"APPLICATION_EXITING": "EXIT_APPLICATION doesn't wait for a reply",
	"COMMAND_EXECUTING":   "sent before COMMAND_COMPLETED, which the clients wait for",
}

// Go string types the connectors name differently. Other string types are
// compared with the connectors' enums of the same name, where they have one.
var enumAliases = map[string]string{
	"Action": "DiscordAction",
}

// Compared on their own, as Python keeps events and replies in one enum.
var protocolEnums = []string{"EventType", "ModuleName", "ResponseSubtype", "ResponseType"}

// Module data types whose Python model has another name.
var pythonAliases = map[string]string{
	"DiskMountsResponse":     "DiskMounts",
	"SettingsHotkey":         "SettingHotkey",
	"SettingsMediaDirectory": "SettingDirectory",
}

// Types in types/ that no connector models, with why.
var unmodelled = map[string]string{
	"Module": "the backend's wrapper for a module's data, never sent as is",
}

// The connectors' models for each request and reply struct in the handlers.
// An empty list means that connector sends a plain dict or object instead.
type pairing struct {
	typescript []string
	python     []string
}

var handlerPairs = map[string]pairing{
	// GET_DIRECTORIES
	"DirectoryInfo": {[]string{"MediaDirectory"}, []string{"MediaDirectory"}},
	// GET_FILE
	"FileInfo": {[]string{"FileDetails"}, []string{"FileInfo"}},
	// GET_FILES
	"GetFileResponseData": {[]string{"FileInfo"}, []string{"MediaFile"}},

	"AudioControlRequestData":            {[]string{"AudioControl"}, []string{"AudioControl"}},
	"BluetoothDeviceRequestData":         {[]string{"BluetoothDeviceRequest"}, []string{"BluetoothDeviceRequest"}},
	"BluetoothPowerRequestData":          {[]string{"BluetoothPowerRequest"}, []string{"BluetoothPowerRequest"}},
	"ClipboardTextRequestData":           {[]string{"ClipboardTextRequest"}, []string{"ClipboardTextRequest"}},
	"DesktopKeyboardLayoutRequestData":   {[]string{"DesktopKeyboardLayoutRequest"}, []string{"DesktopKeyboardLayoutRequest"}},
	"DesktopWindowRequestData":           {[]string{"DesktopWindowRequest"}, []string{"DesktopWindowRequest"}},
	"DesktopWindowStateRequestData":      {[]string{"DesktopWindowStateRequest"}, []string{"DesktopWindowStateRequest"}},
	"DesktopWorkspaceRequestData":        {[]string{"DesktopWorkspaceRequest"}, []string{"DesktopWorkspaceRequest"}},
	"DiscordControlRequestData":          {[]string{"DiscordControl"}, []string{"DiscordControl"}},
	"DiscordSetupRequestData":            {[]string{"DiscordSetupRequest"}, nil},
	"DisplayControlRequestData":          {[]string{"DisplayControl"}, []string{"DisplayControl"}},
	"GetDataRequestData":                 {[]string{"ModulesRequest"}, []string{"GetData"}},
	"GetDirectoriesResponseDataItem":     {[]string{"Directory"}, []string{"MediaDirectory"}},
	"GetDirectoryRequestData":            {[]string{"DirectoryRequest"}, nil},
	"GetFileRequestData":                 {[]string{"PathRequest"}, []string{"MediaGetFile"}},
	"GetFilesRequestData":                {[]string{"GetFilesRequest"}, []string{"MediaGetFiles"}},
	"GetHistoryRequestData":              {[]string{"HistoryRequest"}, nil},
	"HyprlandDispatchRawRequestData":     {[]string{"HyprlandDispatchRawRequest"}, []string{"HyprlandDispatchRawRequest"}},
	"HyprlandDispatchRequestData":        {[]string{"HyprlandDispatchRequest"}, []string{"HyprlandDispatchRequest"}},
	"HyprlandEvalRequestData":            {[]string{"HyprlandEvalRequest"}, []string{"HyprlandEvalRequest"}},
	"HyprlandExecRequestData":            {[]string{"HyprlandExecRequest"}, []string{"HyprlandExecRequest"}},
	"HyprlandGlobalShortcutRequestData":  {[]string{"HyprlandGlobalShortcutRequest"}, []string{"HyprlandGlobalShortcutRequest"}},
	"HyprlandMoveCursorRequestData":      {[]string{"HyprlandMoveCursorRequest"}, []string{"HyprlandMoveCursorRequest"}},
	"HyprlandMoveWindowRequestData":      {[]string{"HyprlandMoveWindowRequest"}, []string{"HyprlandMoveWindowRequest"}},
	"HyprlandMoveWorkspaceRequestData":   {[]string{"HyprlandMoveWorkspaceRequest"}, []string{"HyprlandMoveWorkspaceRequest"}},
	"HyprlandOptionNameRequestData":      {[]string{"HyprlandOptionNameRequest"}, []string{"HyprlandOptionNameRequest"}},
	"HyprlandOptionRequestData":          {[]string{"HyprlandOptionRequest"}, []string{"HyprlandOptionRequest"}},
	"HyprlandRenameWorkspaceRequestData": {[]string{"HyprlandRenameWorkspaceRequest"}, []string{"HyprlandRenameWorkspaceRequest"}},
	"HyprlandSendEventRequestData":       {[]string{"HyprlandSendEventRequest"}, []string{"HyprlandSendEventRequest"}},
	"HyprlandSetWindowRequestData":       {[]string{"HyprlandSetWindowRequest"}, []string{"HyprlandSetWindowRequest"}},
	"HyprlandSubmapRequestData":          {[]string{"HyprlandSubmapRequest"}, []string{"HyprlandSubmapRequest"}},
	"KeyboardTextRequestData":            {[]string{"KeyboardText"}, []string{"KeyboardText"}},
	"MediaControlRequestData":            {[]string{"MediaControl"}, []string{"MediaControl"}},
	"NotificationDismissRequestData":     {[]string{"NotificationDismissRequest"}, []string{"NotificationDismissRequest"}},
	"NotificationEventData":              {[]string{"NotificationEvent"}, []string{"NotificationEvent"}},
	"OmarchyRequestData":                 {[]string{"OmarchyMenuRequest", "OmarchyPanelRequest"}, []string{"OmarchyMenuRequest", "OmarchyPanelRequest"}},
	"ProcessKillRequestData":             {[]string{"ProcessKillRequest"}, []string{"ProcessKillRequest"}},
	"SystemKeepAwakeRequestData":         {[]string{"KeepAwakeRequest"}, []string{"KeepAwakeRequest"}},
	"SystemPowerProfileRequestData":      {[]string{"PowerProfileRequest"}, []string{"PowerProfileRequest"}},
	// OPEN takes a path or a URL, which the connectors model as two requests
	"OpenRequestData":                 {nil, nil},
	"RegisterDataListenerRequestData": {[]string{"ModulesRequest"}, []string{"GetData"}},
	"ValidateDirectoryRequestData":    {[]string{"PathRequest"}, nil},
	"ValidateDirectoryResponseData":   {[]string{"ValidateDirectoryResult"}, nil},
}

// Fields a connector's model leaves out or adds on purpose, keyed by
// "<connector>.<Go struct>.<field>", with why.
var ignoredFields = map[string]string{
	"Python.DirectoryInfo.name":        "derived from the key, as the backend sends none",
	"Python.DirectoryInfo.description": "the model also holds GET_DIRECTORY's reply, which has one",
}

// Python models that name the JSON fields in snake_case.
var snakeCaseModels = map[string]bool{
	"MediaFile": true,
}

var wordBoundary = regexp.MustCompile(`([a-z0-9])([A-Z])`)

func snakeCase(name string) string {
	return strings.ToLower(wordBoundary.ReplaceAllString(name, "${1}_${2}"))
}

// What the Go side declares.
type goSource struct {
	consts  map[string][]string            // Values of each string type
	structs map[string]map[string][]string // Each struct's JSON fields, by directory
}

func parseGo(dirs ...string) (goSource, error) {
	source := goSource{consts: map[string][]string{}, structs: map[string]map[string][]string{}}
	fset := token.NewFileSet()

	for _, dir := range dirs {
		source.structs[dir] = map[string][]string{}

		files, err := filepath.Glob(filepath.Join(dir, "*.go"))
		if err != nil {
			return source, err
		}

		for _, path := range files {
			if strings.HasSuffix(path, "_test.go") {
				continue
			}

			file, err := parser.ParseFile(fset, path, nil, 0)
			if err != nil {
				return source, fmt.Errorf("parsing %s: %w", path, err)
			}

			for _, decl := range file.Decls {
				genDecl, ok := decl.(*ast.GenDecl)
				if !ok {
					continue
				}

				for _, spec := range genDecl.Specs {
					switch spec := spec.(type) {
					case *ast.TypeSpec:
						if structType, ok := spec.Type.(*ast.StructType); ok {
							if fields := jsonFields(structType); len(fields) > 0 {
								source.structs[dir][spec.Name.Name] = fields
							}
						}
					case *ast.ValueSpec:
						typeName, ok := spec.Type.(*ast.Ident)
						if !ok || len(spec.Values) == 0 {
							continue
						}

						if literal, ok := spec.Values[0].(*ast.BasicLit); ok && literal.Kind == token.STRING {
							value, _ := strconv.Unquote(literal.Value)
							source.consts[typeName.Name] = append(source.consts[typeName.Name], value)
						}
					}
				}
			}
		}
	}

	return source, nil
}

func jsonFields(structType *ast.StructType) []string {
	var fields []string

	for _, field := range structType.Fields.List {
		if len(field.Names) == 0 || field.Tag == nil {
			continue
		}

		tag, _ := strconv.Unquote(field.Tag.Value)
		name, _, _ := strings.Cut(reflect.StructTag(tag).Get("json"), ",")

		if name != "" && name != "-" {
			fields = append(fields, name)
		}
	}

	return fields
}

var (
	tsLiterals   = regexp.MustCompile(`(?s)export const (\w+) = Schema\.Literals\(\[(.*?)\]\)`)
	tsStructs    = regexp.MustCompile(`(?s)export const (\w+) = Schema\.Struct\(\{(.*?)\}\);`)
	tsComments   = regexp.MustCompile(`(?s)/\*.*?\*/|//[^\n]*`)
	tsKeys       = regexp.MustCompile(`(\w+):`)
	quoted       = regexp.MustCompile(`"([^"]+)"`)
	pyClass      = regexp.MustCompile(`^class (\w+)(\((\w+)\))?:`)
	pyField      = regexp.MustCompile(`^    (\w+): `)
	pyEnumMember = regexp.MustCompile(`^    \w+ = "([^"]*)"`)
)

// What a connector declares.
type connector struct {
	name    string
	enums   map[string][]string
	models  map[string][]string
	client  string
	mention func(value string) string // How its client refers to a value
}

func parseTypeScript() (connector, error) {
	ts := connector{
		name:    "TypeScript",
		enums:   map[string][]string{},
		models:  map[string][]string{},
		mention: func(value string) string { return strconv.Quote(value) },
	}

	protocol, err := os.ReadFile(tsProtocol)
	if err != nil {
		return ts, err
	}

	for _, match := range tsLiterals.FindAllStringSubmatch(string(protocol), -1) {
		for _, value := range quoted.FindAllStringSubmatch(match[2], -1) {
			ts.enums[match[1]] = append(ts.enums[match[1]], value[1])
		}
	}

	for _, match := range tsStructs.FindAllStringSubmatch(string(protocol), -1) {
		body := tsComments.ReplaceAllString(match[2], "")
		ts.models[match[1]] = []string{}

		for _, key := range tsKeys.FindAllStringSubmatch(body, -1) {
			ts.models[match[1]] = append(ts.models[match[1]], key[1])
		}
	}

	client, err := os.ReadFile(tsClient)
	ts.client = string(client)

	return ts, err
}

func parsePython() (connector, error) {
	py := connector{
		name:    "Python",
		enums:   map[string][]string{},
		models:  map[string][]string{},
		mention: func(value string) string { return "EventType." + value },
	}

	files := []string{pyConst, pyModules}

	err := filepath.WalkDir(pyModels, func(path string, entry os.DirEntry, err error) error {
		if err != nil {
			return err
		}

		// Test data, not models
		if entry.IsDir() && entry.Name() == "fixtures" {
			return filepath.SkipDir
		}

		if strings.HasSuffix(path, ".py") {
			files = append(files, path)
		}

		return nil
	})
	if err != nil {
		return py, err
	}

	// Module data models win when another model shares their name, such as
	// the notification's Audio
	moduleDir := filepath.Dir(pyModules) + string(filepath.Separator)
	slices.SortStableFunc(files, func(a, b string) int {
		aModule, bModule := strings.HasPrefix(a, moduleDir), strings.HasPrefix(b, moduleDir)
		switch {
		case aModule == bModule:
			return 0
		case aModule:
			return 1
		default:
			return -1
		}
	})

	bases := map[string]string{}

	for _, path := range files {
		content, err := os.ReadFile(path)
		if err != nil {
			return py, err
		}

		var class string
		var enum bool

		for line := range strings.SplitSeq(string(content), "\n") {
			if match := pyClass.FindStringSubmatch(line); match != nil {
				class, enum = match[1], strings.HasSuffix(match[3], "Enum")
				bases[class] = match[3]

				if !enum {
					py.models[class] = []string{}
				}

				continue
			}

			if line != "" && !strings.HasPrefix(line, " ") {
				class = ""
			}

			if class == "" {
				continue
			}

			if enum {
				if match := pyEnumMember.FindStringSubmatch(line); match != nil {
					py.enums[class] = append(py.enums[class], match[1])
				}
			} else if match := pyField.FindStringSubmatch(line); match != nil {
				py.models[class] = append(py.models[class], match[1])
			}
		}
	}

	// A dataclass also has the fields of the dataclass it extends
	for class := range py.models {
		for base := bases[class]; base != ""; base = bases[base] {
			py.models[class] = append(py.models[class], py.models[base]...)
		}
	}

	client, err := os.ReadFile(pyClient)
	py.client = string(client)

	return py, err
}

func difference(left, right []string) []string {
	var out []string

	for _, item := range left {
		if !slices.Contains(right, item) && !slices.Contains(out, item) {
			out = append(out, item)
		}
	}

	slices.Sort(out)

	return out
}

type section struct {
	title string
	lines []string
}

// Fields missing from or added by a connector's model of a Go struct.
func compareFields(c connector, model, goName string, goFields []string) []string {
	fields, ok := c.models[model]
	if !ok {
		return []string{fmt.Sprintf("%s: no model %s", goName, model)}
	}

	if c.name == "Python" && snakeCaseModels[model] {
		snake := make([]string, len(goFields))
		for i, field := range goFields {
			snake[i] = snakeCase(field)
		}

		goFields = snake
	}

	var changes []string

	for _, field := range difference(goFields, fields) {
		if _, ok := ignoredFields[c.name+"."+goName+"."+field]; !ok {
			changes = append(changes, "+"+field)
		}
	}

	for _, field := range difference(fields, goFields) {
		if _, ok := ignoredFields[c.name+"."+goName+"."+field]; !ok {
			changes = append(changes, "-"+field)
		}
	}

	if len(changes) == 0 {
		return nil
	}

	label := goName
	if model != goName {
		label += " (" + model + ")"
	}

	return []string{label + " " + strings.Join(changes, " ")}
}

func pythonModel(goName string) string {
	if alias, ok := pythonAliases[goName]; ok {
		return alias
	}

	return strings.TrimSuffix(goName, "Data")
}

func sortedKeys[V any](m map[string]V) []string {
	keys := make([]string, 0, len(m))
	for key := range m {
		keys = append(keys, key)
	}

	slices.Sort(keys)

	return keys
}

func main() {
	backend, err := parseGo(
		"event", "event/handler", "utils/handlers/filesystem", "utils/handlers/media",
		"discord", "types", "settings",
	)
	if err != nil {
		fail(err)
	}

	ts, err := parseTypeScript()
	if err != nil {
		fail(err)
	}

	py, err := parsePython()
	if err != nil {
		fail(err)
	}

	events := backend.consts["EventType"]
	replies := backend.consts["ResponseType"]
	subtypes := backend.consts["ResponseSubtype"]
	modules := backend.consts["ModuleName"]

	// Python keeps events and replies in one enum
	pyEvents := py.enums["EventType"]
	bothKinds := append(slices.Clone(events), replies...)

	sections := []section{
		{"Events the TypeScript connector doesn't know", difference(events, ts.enums["EventType"])},
		{"Events the TypeScript connector knows that the backend doesn't", difference(ts.enums["EventType"], events)},
		{"Replies the TypeScript connector doesn't know", difference(replies, ts.enums["ResponseType"])},
		{"Replies the TypeScript connector knows that the backend doesn't", difference(ts.enums["ResponseType"], replies)},
		{"Error subtypes the TypeScript connector doesn't know", difference(subtypes, ts.enums["ResponseSubtype"])},
		{"Error subtypes the TypeScript connector knows that the backend doesn't", difference(ts.enums["ResponseSubtype"], subtypes)},
		{"Events and replies the Python connector doesn't know", difference(bothKinds, pyEvents)},
		{"Events and replies the Python connector knows that the backend doesn't", difference(pyEvents, bothKinds)},
		{"Error subtypes the Python connector doesn't know", difference(subtypes, py.enums["EventSubType"])},
		{"Error subtypes the Python connector knows that the backend doesn't", difference(py.enums["EventSubType"], subtypes)},
		{"Modules the Python connector doesn't know", difference(modules, py.enums[pyModuleEnum])},
		{"Modules the Python connector knows that the backend doesn't", difference(py.enums[pyModuleEnum], modules)},
	}

	// The TypeScript enums for types/ are generated into modules.ts, which
	// isn't read here, so only its hand-written ones are compared
	for _, c := range []connector{ts, py} {
		var changed []string

		for _, goName := range sortedKeys(backend.consts) {
			if slices.Contains(protocolEnums, goName) {
				continue
			}

			name := goName
			if alias, ok := enumAliases[goName]; ok {
				name = alias
			}

			values, ok := c.enums[name]
			if !ok {
				continue
			}

			var changes []string
			for _, value := range difference(backend.consts[goName], values) {
				changes = append(changes, "+"+value)
			}

			for _, value := range difference(values, backend.consts[goName]) {
				changes = append(changes, "-"+value)
			}

			if len(changes) > 0 {
				changed = append(changed, name+" "+strings.Join(changes, " "))
			}
		}

		sections = append(sections, section{
			fmt.Sprintf("%s enum values (+ only in the backend, - only in %s)", c.name, c.name), changed,
		})
	}

	for _, c := range []connector{ts, py} {
		var unsent, unhandled []string

		for _, event := range events {
			if !strings.Contains(c.client, c.mention(event)) {
				unsent = append(unsent, event)
			}
		}

		for _, reply := range replies {
			if _, ok := unhandledReplies[reply]; !ok && !strings.Contains(c.client, c.mention(reply)) {
				unhandled = append(unhandled, reply)
			}
		}

		sections = append(sections,
			section{fmt.Sprintf("Events the %s client never sends", c.name), unsent},
			section{fmt.Sprintf("Replies the %s client never waits for or handles", c.name), unhandled},
		)
	}

	// Module data, which the TypeScript connector generates
	var pyData []string
	for _, name := range sortedKeys(backend.structs["types"]) {
		if _, ok := unmodelled[name]; !ok {
			pyData = append(pyData, compareFields(py, pythonModel(name), name, backend.structs["types"][name])...)
		}
	}

	var tsSettings, pySettings []string
	for _, name := range sortedKeys(backend.structs["settings"]) {
		fields := backend.structs["settings"][name]
		tsSettings = append(tsSettings, compareFields(ts, name, name, fields)...)
		pySettings = append(pySettings, compareFields(py, pythonModel(name), name, fields)...)
	}

	handlerStructs := map[string][]string{}
	maps.Copy(handlerStructs, backend.structs["event/handler"])
	maps.Copy(handlerStructs, backend.structs["utils/handlers/filesystem"])

	var tsRequests, pyRequests, unpaired []string
	for _, name := range sortedKeys(handlerStructs) {
		fields := handlerStructs[name]

		pair, ok := handlerPairs[name]
		if !ok {
			unpaired = append(unpaired, name)
			continue
		}

		for _, model := range pair.typescript {
			tsRequests = append(tsRequests, compareFields(ts, model, name, fields)...)
		}

		for _, model := range pair.python {
			pyRequests = append(pyRequests, compareFields(py, model, name, fields)...)
		}
	}

	sections = append(sections,
		section{"Python module data fields (+ only in the backend, - only in Python)", pyData},
		section{"TypeScript settings fields (+ only in the backend, - only in TypeScript)", tsSettings},
		section{"Python settings fields (+ only in the backend, - only in Python)", pySettings},
		section{"TypeScript request and reply fields (+ only in the backend, - only in TypeScript)", tsRequests},
		section{"Python request and reply fields (+ only in the backend, - only in Python)", pyRequests},
		section{"Request and reply structs missing from handlerPairs", unpaired},
	)

	drift := 0
	for _, s := range sections {
		if len(s.lines) == 0 {
			continue
		}

		drift += len(s.lines)
		fmt.Printf("%s:\n  %s\n\n", s.title, strings.Join(s.lines, "\n  "))
	}

	if drift > 0 {
		fmt.Fprintf(os.Stderr, "%d differences between the connectors and the backend\n", drift)
		os.Exit(1)
	}

	fmt.Printf("No drift across %d events, %d replies, %d error subtypes and %d modules\n",
		len(events), len(replies), len(subtypes), len(modules))
}

func fail(err error) {
	fmt.Fprintln(os.Stderr, err)
	os.Exit(1)
}
