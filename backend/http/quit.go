package http

import (
	"net"
	"net/http"

	"github.com/timmo001/system-bridge/keys"
)

// QuitHandler lets the local desktop client request a graceful shutdown.
func QuitHandler(auth *keys.Auth, quit func()) http.HandlerFunc {
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
		if !auth.ValidOrShared(r) {
			http.Error(w, "Invalid API key", http.StatusUnauthorized)
			return
		}
		w.WriteHeader(http.StatusNoContent)
		if err := http.NewResponseController(w).Flush(); err != nil {
			return
		}
		quit()
	}
}
