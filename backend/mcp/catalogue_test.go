package mcp

import (
	"context"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// The agent command lists the tools without a backend, so registering them
// must not need the router or data store
func TestListToolsWithoutBackend(t *testing.T) {
	tools, err := ListTools(context.Background())
	require.NoError(t, err)
	require.Len(t, tools, 52)

	readOnly := map[string]bool{}
	for _, tool := range tools {
		readOnly[tool.Name] = tool.Annotations != nil && tool.Annotations.ReadOnlyHint
	}
	assert.True(t, readOnly["system_bridge_get_data"])
	assert.True(t, readOnly["system_bridge_list_files"])
	assert.False(t, readOnly["system_bridge_run_command"])
	assert.False(t, readOnly["system_bridge_camera_capture"])
}
