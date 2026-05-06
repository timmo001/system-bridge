package auth

import (
	"net/http/httptest"
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestTokenFromAuthorizationHeader(t *testing.T) {
	assert.Equal(t, "test-token", TokenFromAuthorizationHeader("Bearer test-token"))
	assert.Equal(t, "test-token", TokenFromAuthorizationHeader("bearer test-token"))
	assert.Equal(t, "", TokenFromAuthorizationHeader("Basic test-token"))
	assert.Equal(t, "", TokenFromAuthorizationHeader("test-token"))
	assert.Equal(t, "", TokenFromAuthorizationHeader(""))
}

func TestTokenFromRequest(t *testing.T) {
	t.Run("prefers bearer header", func(t *testing.T) {
		req := httptest.NewRequest("GET", "/api/data/cpu?token=query-token", nil)
		req.Header.Set("Authorization", "Bearer bearer-token")
		req.Header.Set("X-API-Token", "header-token")

		assert.Equal(t, "bearer-token", TokenFromRequest(req, RequestTokenOptions{AllowQuery: true}))
	})

	t.Run("falls back to legacy headers", func(t *testing.T) {
		req := httptest.NewRequest("GET", "/api/data/cpu", nil)
		req.Header.Set("X-API-Token", "header-token")

		assert.Equal(t, "header-token", TokenFromRequest(req, RequestTokenOptions{}))

		req = httptest.NewRequest("GET", "/api/data/cpu", nil)
		req.Header.Set("token", "legacy-token")

		assert.Equal(t, "legacy-token", TokenFromRequest(req, RequestTokenOptions{}))
	})

	t.Run("uses query token when enabled", func(t *testing.T) {
		req := httptest.NewRequest("GET", "/api/media/file/data?token=query-token", nil)

		assert.Equal(t, "query-token", TokenFromRequest(req, RequestTokenOptions{AllowQuery: true}))
		assert.Equal(t, "", TokenFromRequest(req, RequestTokenOptions{}))
	})
}

func TestValidatorValidateToken(t *testing.T) {
	validator := NewValidator("expected-token")

	assert.True(t, validator.ValidateToken("expected-token"))
	assert.False(t, validator.ValidateToken("wrong-token"))
	assert.False(t, validator.ValidateToken(""))
}
