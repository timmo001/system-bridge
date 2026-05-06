package mcp

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/timmo001/system-bridge/data"
	"github.com/timmo001/system-bridge/event"
)

func TestHandleConnectionAuth(t *testing.T) {
	dataStore, err := data.NewDataStore()
	require.NoError(t, err)

	server := NewMCPServer("test-token", event.NewMessageRouter(), dataStore)

	t.Run("rejects missing token", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/api/mcp", nil)
		rr := httptest.NewRecorder()

		err := server.HandleConnection(rr, req)

		require.NoError(t, err)
		assert.Equal(t, http.StatusUnauthorized, rr.Code)
	})

	t.Run("rejects invalid token", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/api/mcp?token=wrong-token", nil)
		rr := httptest.NewRecorder()

		err := server.HandleConnection(rr, req)

		require.NoError(t, err)
		assert.Equal(t, http.StatusUnauthorized, rr.Code)
	})
}
