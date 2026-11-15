package http

import (
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestRequireVersion(t *testing.T) {
	for _, test := range []struct {
		name, path, client string
		status             int
	}{
		{"no version", "/api/event", "", http.StatusOK},
		{"same version", "/api/event", "1.0.0", http.StatusOK},
		{"other version", "/api/event", "0.9.0", http.StatusUpgradeRequired},
		{"health of any version", "/api/health", "0.9.0", http.StatusOK},
	} {
		t.Run(test.name, func(t *testing.T) {
			handler := RequireVersion("1.0.0", http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				w.WriteHeader(http.StatusOK)
			}))
			request := httptest.NewRequest("GET", test.path, nil)
			if test.client != "" {
				request.Header.Set(VersionHeader, test.client)
			}
			response := httptest.NewRecorder()
			handler.ServeHTTP(response, request)
			if response.Code != test.status {
				t.Fatalf("got status=%d, want %d", response.Code, test.status)
			}
		})
	}
}
