// Package services reads what a computer's services, timers and checks are
// doing from provider commands, and runs their actions. System Bridge owns
// the provider document, so any tool can be a provider.
package services

import (
	"bytes"
	"encoding/json"
	"fmt"
	"math"
	"strconv"

	"github.com/timmo001/system-bridge/types"
)

// documentVersion is the provider document version System Bridge reads
const documentVersion = 1

// document is what a provider's list command prints. Keys this version
// doesn't know are ignored, so a newer provider still works.
type document struct {
	Version int             `json:"version"`
	Updated int64           `json:"updated"`
	Busy    []documentBusy  `json:"busy"`
	Items   []documentItem  `json:"items"`
	Errors  []documentError `json:"errors"`
}

type documentBusy struct {
	Item  string `json:"item"`
	Label string `json:"label"`
	Since *int64 `json:"since"`
}

type documentItem struct {
	ID          string                `json:"id"`
	Label       string                `json:"label"`
	Kind        string                `json:"kind"`
	Health      types.ServiceHealth   `json:"health"`
	Summary     *string               `json:"summary"`
	Busy        bool                  `json:"busy"`
	LastRun     *int64                `json:"lastRun"`
	LastSuccess *int64                `json:"lastSuccess"`
	NextRun     *int64                `json:"nextRun"`
	Progress    *float64              `json:"progress"`
	Stats       []documentStat        `json:"stats"`
	Notes       []string              `json:"notes"`
	Lists       []documentList        `json:"lists"`
	Actions     []types.ServiceAction `json:"actions"`
}

type documentList struct {
	ID    string             `json:"id"`
	Label string             `json:"label"`
	Items []documentListItem `json:"items"`
}

// documentListItem takes a number as its value too, shown as text
type documentListItem struct {
	Label string          `json:"label"`
	Value json.RawMessage `json:"value"`
}

type documentStat struct {
	ID    string                 `json:"id"`
	Label string                 `json:"label"`
	Value json.RawMessage        `json:"value"`
	Unit  *string                `json:"unit"`
	Kind  *types.ServiceStatKind `json:"kind"`
}

type documentError struct {
	Source  string `json:"source"`
	Message string `json:"message"`
}

// reading is one provider's decoded document
type reading struct {
	items  []types.ServiceItem
	busy   []types.ServiceBusy
	errors []types.ServiceError
}

// healthRank orders the health values worst first
var healthRank = map[types.ServiceHealth]int{
	types.ServiceHealthFailed:   0,
	types.ServiceHealthMissing:  1,
	types.ServiceHealthInactive: 2,
	types.ServiceHealthStale:    3,
	types.ServiceHealthDegraded: 4,
	types.ServiceHealthWarning:  5,
	types.ServiceHealthRunning:  6,
	types.ServiceHealthPaused:   7,
	types.ServiceHealthOK:       8,
}

// decode reads a provider document. A document of another version, or one
// that isn't JSON, is an error. An item System Bridge can't use is left out,
// with an error saying why, so one bad item doesn't hide the rest.
func decode(provider string, raw []byte) (reading, error) {
	var doc document
	if err := json.Unmarshal(raw, &doc); err != nil {
		return reading{}, fmt.Errorf("decode provider document: %w", err)
	}
	if doc.Version != documentVersion {
		return reading{}, fmt.Errorf("unsupported provider document version %d, expected %d", doc.Version, documentVersion)
	}

	result := reading{
		items:  make([]types.ServiceItem, 0, len(doc.Items)),
		busy:   make([]types.ServiceBusy, 0, len(doc.Busy)),
		errors: make([]types.ServiceError, 0, len(doc.Errors)),
	}
	itemError := func(source, message string) {
		result.errors = append(result.errors, types.ServiceError{Provider: provider, Source: source, Message: message})
	}

	for _, e := range doc.Errors {
		result.errors = append(result.errors, types.ServiceError{Provider: provider, Source: e.Source, Message: e.Message})
	}

	seen := make(map[string]bool, len(doc.Items))
	for i, item := range doc.Items {
		switch {
		case item.ID == "":
			itemError(fmt.Sprintf("item %d", i), "has no id")
			continue
		case seen[item.ID]:
			itemError("item "+item.ID, "repeats an earlier item's id")
			continue
		}
		if _, ok := healthRank[item.Health]; !ok {
			itemError("item "+item.ID, fmt.Sprintf("has an unknown health %q", item.Health))
			continue
		}
		seen[item.ID] = true

		label := item.Label
		if label == "" {
			label = item.ID
		}
		decoded := types.ServiceItem{
			Provider:    provider,
			ID:          item.ID,
			Label:       label,
			Kind:        item.Kind,
			Health:      item.Health,
			Summary:     item.Summary,
			Busy:        item.Busy,
			LastRun:     item.LastRun,
			LastSuccess: item.LastSuccess,
			NextRun:     item.NextRun,
			Progress:    item.Progress,
			Stats:       make([]types.ServiceStat, 0, len(item.Stats)),
			Notes:       nonNil(item.Notes),
			Lists:       make([]types.ServiceList, 0, len(item.Lists)),
			Actions:     make([]types.ServiceAction, 0, len(item.Actions)),
		}
		if decoded.Progress != nil && (math.IsNaN(*decoded.Progress) || *decoded.Progress < 0 || *decoded.Progress > 1) {
			itemError("item "+item.ID, "has a progress outside 0 to 1")
			decoded.Progress = nil
		}

		for _, stat := range item.Stats {
			value, ok := statValue(stat.Value)
			if !ok || stat.ID == "" {
				itemError("item "+item.ID, fmt.Sprintf("stat %q needs an id and a number or string value", stat.ID))
				continue
			}
			decoded.Stats = append(decoded.Stats, types.ServiceStat{
				ID: stat.ID, Label: stat.Label, Value: value, Unit: stat.Unit, Kind: stat.Kind,
			})
		}
		for _, list := range item.Lists {
			rows := make([]types.ServiceListItem, 0, len(list.Items))
			for _, row := range list.Items {
				value, _ := statValue(row.Value)
				switch v := value.(type) {
				case float64:
					rows = append(rows, types.ServiceListItem{Label: row.Label, Value: strconv.FormatFloat(v, 'f', -1, 64)})
				case string:
					rows = append(rows, types.ServiceListItem{Label: row.Label, Value: v})
				default:
					rows = append(rows, types.ServiceListItem{Label: row.Label})
				}
			}
			decoded.Lists = append(decoded.Lists, types.ServiceList{ID: list.ID, Label: list.Label, Items: rows})
		}
		for _, action := range item.Actions {
			if action.ID == "" {
				itemError("item "+item.ID, "has an action with no id")
				continue
			}
			if action.Label == "" {
				action.Label = action.ID
			}
			decoded.Actions = append(decoded.Actions, action)
		}

		result.items = append(result.items, decoded)
	}

	for _, busy := range doc.Busy {
		if busy.Item == "" {
			itemError("busy", "an entry has no item")
			continue
		}
		label := busy.Label
		if label == "" {
			label = busy.Item
		}
		result.busy = append(result.busy, types.ServiceBusy{Provider: provider, Item: busy.Item, Label: label, Since: busy.Since})
	}

	return result, nil
}

// statValue is a stat's value as a number or a string
func statValue(raw json.RawMessage) (any, bool) {
	raw = bytes.TrimSpace(raw)
	if len(raw) == 0 {
		return nil, false
	}
	var number float64
	if err := json.Unmarshal(raw, &number); err == nil {
		return number, true
	}
	var text string
	if err := json.Unmarshal(raw, &text); err == nil {
		return text, true
	}
	return nil, false
}

func nonNil[T any](items []T) []T {
	if items == nil {
		return []T{}
	}
	return items
}
