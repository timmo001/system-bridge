package services

import (
	"context"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/timmo001/system-bridge/settings"
	"github.com/timmo001/system-bridge/types"
)

func TestCheckOnlyRunsListedEnabledActions(t *testing.T) {
	data := types.ServicesData{Items: []types.ServiceItem{{
		Provider: "dot",
		ID:       "backup",
		Actions: []types.ServiceAction{
			{ID: "start", Label: "Run now"},
			{ID: "verify", Label: "Verify", Disabled: ptr("Runs after the upload")},
		},
	}}}
	providers := []settings.SettingsServiceProvider{
		{ID: "dot", List: []string{"dot"}, Act: []string{"dot", "services", "act"}},
		{ID: "readonly", List: []string{"check"}},
	}

	act, err := Check(data, providers, "dot", "backup", "start")
	require.NoError(t, err)
	assert.Equal(t, []string{"dot", "services", "act"}, act)

	for name, request := range map[string][3]string{
		"unknown provider": {"other", "backup", "start"},
		"no act command":   {"readonly", "backup", "start"},
		"unknown item":     {"dot", "sync", "start"},
		"unlisted action":  {"dot", "backup", "delete"},
		"disabled action":  {"dot", "backup", "verify"},
	} {
		_, err := Check(data, providers, request[0], request[1], request[2])
		assert.ErrorIs(t, err, ErrActionNotFound, name)
	}
}

func TestRunAppendsItemAndAction(t *testing.T) {
	act := []string{"sh", "-c", `echo "ran $2 on $1"`, "sh"}

	result := Run(context.Background(), act, "dot", "backup", "start")

	assert.True(t, result.OK)
	assert.Equal(t, "ran start on backup", result.Summary)
	assert.Equal(t, "ran start on backup\n", result.Output)
}

func TestRunReportsAFailure(t *testing.T) {
	act := []string{"sh", "-c", `echo "repository locked" >&2; exit 3`, "sh"}

	result := Run(context.Background(), act, "dot", "backup", "start")

	assert.False(t, result.OK)
	assert.Equal(t, "Exited with code 3: repository locked", result.Summary)
	assert.Equal(t, "repository locked", result.Output)
}
