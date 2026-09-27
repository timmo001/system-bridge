package http

import (
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestQuitHandler(t *testing.T) {
	for _, test := range []struct {
		name, method, address, token string
		status                       int
		quit                         bool
	}{
		{"confirmed local client", "POST", "127.0.0.1:1234", "secret", http.StatusNoContent, true},
		{"IPv6 loopback", "POST", "[::1]:1234", "secret", http.StatusNoContent, true},
		{"remote client", "POST", "192.0.2.1:1234", "secret", http.StatusForbidden, false},
		{"missing token", "POST", "127.0.0.1:1234", "", http.StatusUnauthorized, false},
		{"wrong token", "POST", "127.0.0.1:1234", "wrong", http.StatusUnauthorized, false},
		{"link cannot quit", "GET", "127.0.0.1:1234", "secret", http.StatusMethodNotAllowed, false},
	} {
		t.Run(test.name, func(t *testing.T) {
			request := httptest.NewRequest(test.method, "/api/quit", nil)
			request.RemoteAddr = test.address
			request.Header.Set("X-API-Token", test.token)
			response := httptest.NewRecorder()
			quit := false
			QuitHandler("secret", func() { quit = true })(response, request)
			if response.Code != test.status || quit != test.quit {
				t.Fatalf("got status=%d quit=%v, want status=%d quit=%v", response.Code, quit, test.status, test.quit)
			}
		})
	}
}
