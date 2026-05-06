package http

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	backend_auth "github.com/timmo001/system-bridge/backend/auth"
	"github.com/timmo001/system-bridge/data"
)

func TestGetModuleDataHandlerAuth(t *testing.T) {
	dataStore, err := data.NewDataStore()
	require.NoError(t, err)

	handler := GetModuleDataHandler(dataStore, backend_auth.NewValidator("test-token"))

	t.Run("rejects missing token", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/api/data/cpu", nil)
		rr := httptest.NewRecorder()

		handler(rr, req)

		assert.Equal(t, http.StatusUnauthorized, rr.Code)
	})

	t.Run("accepts bearer token", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/api/data/cpu", nil)
		req.Header.Set("Authorization", "Bearer test-token")
		rr := httptest.NewRecorder()

		handler(rr, req)

		assert.Equal(t, http.StatusOK, rr.Code)
	})

	t.Run("accepts legacy x-api-token header", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/api/data/cpu", nil)
		req.Header.Set("X-API-Token", "test-token")
		rr := httptest.NewRecorder()

		handler(rr, req)

		assert.Equal(t, http.StatusOK, rr.Code)
	})
}

func TestGetModuleDataHandlerReturnsJSONError(t *testing.T) {
	dataStore, err := data.NewDataStore()
	require.NoError(t, err)

	handler := GetModuleDataHandler(dataStore, backend_auth.NewValidator("test-token"))
	req := httptest.NewRequest(http.MethodGet, "/api/data/unknown", nil)
	req.Header.Set("Authorization", "Bearer test-token")
	rr := httptest.NewRecorder()

	handler(rr, req)

	assert.Equal(t, http.StatusNotFound, rr.Code)
	var body map[string]string
	require.NoError(t, json.Unmarshal(rr.Body.Bytes(), &body))
	assert.Equal(t, "Module not found", body["error"])
}
