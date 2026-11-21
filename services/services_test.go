package services

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/timmo001/system-bridge/settings"
	"github.com/timmo001/system-bridge/types"
)

const busyDocument = `{
	"version": 1,
	"busy": [{ "item": "backup", "label": "Backup" }],
	"items": [
		{ "id": "backup", "label": "Backup", "kind": "timer", "health": "running", "busy": true,
		  "actions": [{ "id": "start", "label": "Run now" }] },
		{ "id": "sync", "label": "Sync", "kind": "check", "health": "failed" }
	]
}`

func TestFailingProviderKeepsItsItemsAsStale(t *testing.T) {
	output, outputErr := busyDocument, error(nil)
	reader := NewReader()
	reader.list = func(context.Context, []string) ([]byte, error) { return []byte(output), outputErr }
	reader.now = func() time.Time { return time.UnixMilli(1000) }
	providers := []settings.SettingsServiceProvider{{ID: "dot", List: []string{"dot"}, Act: []string{"dot"}}}

	first := reader.Read(context.Background(), providers)
	require.Len(t, first.Items, 2)
	assert.Nil(t, first.Providers[0].Error)

	outputErr = errors.New("exited with code 1")
	second := reader.Read(context.Background(), providers)

	assert.Equal(t, "exited with code 1", *second.Providers[0].Error)
	assert.Equal(t, int64(1000), *second.Providers[0].Updated, "keeps when it last read")
	assert.Equal(t, types.ServiceHealthStale, second.Items[0].Health)
	assert.Equal(t, types.ServiceHealthFailed, second.Items[1].Health, "a worse health stays")
	assert.Equal(t, first.Busy, second.Busy, "still busy, rather than reading as idle")
}

func TestFailingProviderWithNothingReadYet(t *testing.T) {
	reader := NewReader()
	reader.list = func(context.Context, []string) ([]byte, error) { return nil, errors.New("not found") }

	data := reader.Read(context.Background(), []settings.SettingsServiceProvider{{ID: "dot", List: []string{"dot"}}})

	assert.Equal(t, "not found", *data.Providers[0].Error)
	assert.Nil(t, data.Providers[0].Updated)
	assert.Empty(t, data.Items)
	assert.NotNil(t, data.Items)
}

func TestProviderWithoutActHasNoActions(t *testing.T) {
	reader := NewReader()
	reader.list = func(context.Context, []string) ([]byte, error) { return []byte(busyDocument), nil }

	data := reader.Read(context.Background(), []settings.SettingsServiceProvider{{ID: "dot", List: []string{"dot"}}})

	assert.Empty(t, data.Items[0].Actions)
}
