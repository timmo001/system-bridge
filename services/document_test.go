package services

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/timmo001/system-bridge/types"
)

func TestDecodeDocument(t *testing.T) {
	raw := []byte(`{
		"version": 1,
		"updated": 1763600000000,
		"busy": [{ "item": "kopia-offsite", "label": "Off-site backup", "since": 1763599500000 }],
		"items": [{
			"id": "kopia-offsite", "label": "Off-site backup", "kind": "timer",
			"health": "running", "summary": "Uploading to B2", "busy": true,
			"lastRun": 1763599500000, "lastSuccess": 1763513100000, "nextRun": 1763685900000,
			"progress": 0.4,
			"stats": [
				{ "id": "r2_used", "label": "R2 used", "value": 7.1, "unit": "GB", "kind": "size" },
				{ "id": "state", "label": "State", "value": "uploading" },
				{ "id": "bad", "label": "Bad", "value": { "nested": true } }
			],
			"notes": ["B2 is capped at the free 10 GB"],
			"lists": [{ "id": "sources", "label": "Sources", "items": [
				{ "label": "Photos", "value": "02:27" },
				{ "label": "Files", "value": 12 }
			] }],
			"actions": [
				{ "id": "start", "label": "Run now" },
				{ "id": "verify", "label": "Verify", "confirm": "Read back 10% of the files?", "disabled": "Runs after the upload" }
			],
			"newerKey": "ignored"
		},
		{ "id": "unknown-health", "health": "fine" },
		{ "id": "kopia-offsite", "health": "ok" },
		{ "health": "ok" }],
		"errors": [{ "source": "services.d/foo.yml", "message": "Unknown key busyy" }]
	}`)

	got, err := decode("dot", raw)
	require.NoError(t, err)

	require.Len(t, got.items, 1)
	item := got.items[0]
	assert.Equal(t, "dot", item.Provider)
	assert.Equal(t, types.ServiceHealthRunning, item.Health)
	assert.Equal(t, int64(1763513100000), *item.LastSuccess)
	assert.Equal(t, []types.ServiceStat{
		{ID: "r2_used", Label: "R2 used", Value: 7.1, Unit: ptr("GB"), Kind: ptr(types.ServiceStatKindSize)},
		{ID: "state", Label: "State", Value: "uploading"},
	}, item.Stats)
	assert.Equal(t, []types.ServiceListItem{{Label: "Photos", Value: "02:27"}, {Label: "Files", Value: "12"}}, item.Lists[0].Items)
	assert.Equal(t, "Runs after the upload", *item.Actions[1].Disabled)

	assert.Equal(t, []types.ServiceBusy{{Provider: "dot", Item: "kopia-offsite", Label: "Off-site backup", Since: ptr(int64(1763599500000))}}, got.busy)

	// The provider's own error, then one for each thing left out
	sources := make([]string, 0, len(got.errors))
	for _, e := range got.errors {
		sources = append(sources, e.Source)
	}
	assert.Equal(t, []string{"services.d/foo.yml", "item kopia-offsite", "item unknown-health", "item kopia-offsite", "item 3"}, sources)
}

func TestDecodeRejectsOtherVersions(t *testing.T) {
	_, err := decode("dot", []byte(`{"version": 2, "items": []}`))
	assert.ErrorContains(t, err, "unsupported provider document version 2")

	_, err = decode("dot", []byte(`not json`))
	assert.Error(t, err)
}

func TestDecodeEmptyListsAreNotNull(t *testing.T) {
	got, err := decode("dot", []byte(`{"version": 1, "items": [{"id": "a", "health": "ok"}]}`))
	require.NoError(t, err)
	assert.NotNil(t, got.items[0].Stats)
	assert.NotNil(t, got.items[0].Notes)
	assert.NotNil(t, got.items[0].Lists)
	assert.NotNil(t, got.items[0].Actions)
	assert.NotNil(t, got.busy)
	assert.NotNil(t, got.errors)
}

func ptr[T any](v T) *T { return &v }
