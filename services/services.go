package services

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"sync"
	"time"

	"github.com/timmo001/system-bridge/settings"
	"github.com/timmo001/system-bridge/types"
	"github.com/timmo001/system-bridge/utils"
)

// Reader reads the providers, keeping each one's last good read so a
// provider that fails still shows what it last reported
type Reader struct {
	mu   sync.Mutex
	last map[string]lastReading
	// list runs a provider's list command; tests replace it
	list func(context.Context, []string) ([]byte, error)
	now  func() time.Time
}

type lastReading struct {
	reading
	updated int64
}

// Default is the reader the services module and actions share
var Default = NewReader()

func NewReader() *Reader {
	return &Reader{last: map[string]lastReading{}, list: list, now: time.Now}
}

// Read runs every provider's list command at once and merges what they
// report, in the order the providers are set
func (r *Reader) Read(ctx context.Context, providers []settings.SettingsServiceProvider) types.ServicesData {
	type outcome struct {
		reading reading
		err     error
	}
	outcomes := make([]outcome, len(providers))
	var wg sync.WaitGroup
	for i, provider := range providers {
		wg.Add(1)
		go func() {
			defer wg.Done()
			raw, err := r.list(ctx, provider.List)
			if err != nil {
				outcomes[i].err = err
				return
			}
			outcomes[i].reading, outcomes[i].err = decode(provider.ID, raw)
		}()
	}
	wg.Wait()

	r.mu.Lock()
	defer r.mu.Unlock()

	data := types.ServicesData{
		Providers: make([]types.ServiceProvider, 0, len(providers)),
		Items:     []types.ServiceItem{},
		Busy:      []types.ServiceBusy{},
		Errors:    []types.ServiceError{},
	}
	current := make(map[string]bool, len(providers))
	for i, provider := range providers {
		current[provider.ID] = true
		status := types.ServiceProvider{ID: provider.ID}
		got := outcomes[i]

		var shown reading
		if got.err == nil {
			updated := r.now().UnixMilli()
			r.last[provider.ID] = lastReading{reading: got.reading, updated: updated}
			status.Updated = &updated
			shown = got.reading
		} else {
			message := utils.MaskUserPaths(got.err.Error())
			slog.Warn("Failed to read services provider", "provider", provider.ID, "error", message)
			status.Error = &message
			if last, ok := r.last[provider.ID]; ok {
				updated := last.updated
				status.Updated = &updated
				shown = stale(last.reading)
			}
		}

		items := shown.items
		if len(provider.Act) == 0 {
			items = withoutActions(items)
		}
		data.Providers = append(data.Providers, status)
		data.Items = append(data.Items, items...)
		data.Busy = append(data.Busy, shown.busy...)
		data.Errors = append(data.Errors, shown.errors...)
	}

	// Forget providers taken out of the settings
	for id := range r.last {
		if !current[id] {
			delete(r.last, id)
		}
	}

	return data
}

// FromModuleData is the services module's data as stored. After a restart
// it's the JSON loaded from disk, until the next read replaces it.
func FromModuleData(data any) (types.ServicesData, error) {
	empty := types.ServicesData{
		Providers: []types.ServiceProvider{},
		Items:     []types.ServiceItem{},
		Busy:      []types.ServiceBusy{},
		Errors:    []types.ServiceError{},
	}
	switch v := data.(type) {
	case nil:
		return empty, nil
	case types.ServicesData:
		return v, nil
	}
	raw, err := json.Marshal(data)
	if err != nil {
		return empty, fmt.Errorf("encode services data: %w", err)
	}
	if err := json.Unmarshal(raw, &empty); err != nil {
		return empty, fmt.Errorf("decode services data: %w", err)
	}
	return empty, nil
}

// stale is a reading from a provider that has since failed: each item is
// stale unless it was worse already. The busy list stays, as a provider that
// can't be read mustn't look like it has nothing busy.
func stale(last reading) reading {
	items := make([]types.ServiceItem, len(last.items))
	for i, item := range last.items {
		if healthRank[item.Health] > healthRank[types.ServiceHealthStale] {
			item.Health = types.ServiceHealthStale
		}
		items[i] = item
	}
	return reading{items: items, busy: last.busy, errors: last.errors}
}

// withoutActions drops the actions of a provider with no act command, which
// couldn't run them
func withoutActions(items []types.ServiceItem) []types.ServiceItem {
	out := make([]types.ServiceItem, len(items))
	for i, item := range items {
		item.Actions = []types.ServiceAction{}
		out[i] = item
	}
	return out
}
