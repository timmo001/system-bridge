package http

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/stretchr/testify/assert"
	backend_auth "github.com/timmo001/system-bridge/backend/auth"
)

func TestServeMediaFileDataHandlerAuth(t *testing.T) {
	handler := ServeMediaFileDataHandler(backend_auth.NewValidator("test-token"))

	t.Run("rejects missing token", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/api/media/file/data?base=home&path=file.txt", nil)
		rr := httptest.NewRecorder()

		handler(rr, req)

		assert.Equal(t, http.StatusUnauthorized, rr.Code)
	})

	t.Run("accepts legacy query token", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/api/media/file/data?base=missing&path=file.txt&token=test-token", nil)
		rr := httptest.NewRecorder()

		handler(rr, req)

		assert.Equal(t, http.StatusBadRequest, rr.Code)
	})

	t.Run("accepts bearer token", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/api/media/file/data?base=missing&path=file.txt", nil)
		req.Header.Set("Authorization", "Bearer test-token")
		rr := httptest.NewRecorder()

		handler(rr, req)

		assert.Equal(t, http.StatusBadRequest, rr.Code)
	})
}
