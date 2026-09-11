package http

import (
	"crypto/subtle"
	"net"
	"net/http"
)

// QuitHandler lets the local desktop client request a graceful shutdown.
func QuitHandler(token string, quit func()) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			w.Header().Set("Allow", http.MethodPost)
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
			return
		}
		host, _, err := net.SplitHostPort(r.RemoteAddr)
		if err != nil || !net.ParseIP(host).IsLoopback() {
			http.Error(w, "Local requests only", http.StatusForbidden)
			return
		}
		if token == "" || subtle.ConstantTimeCompare([]byte(r.Header.Get("X-API-Token")), []byte(token)) != 1 {
			http.Error(w, "Invalid API token", http.StatusUnauthorized)
			return
		}
		w.WriteHeader(http.StatusNoContent)
		if err := http.NewResponseController(w).Flush(); err != nil {
			return
		}
		quit()
	}
}
