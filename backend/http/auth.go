package http

import (
	"crypto/subtle"
	"encoding/json"
	"log/slog"
	"net/http"
	"strings"
)

// TokenValid says whether a request carries the API token, as X-API-Token,
// the older token header or Authorization: Bearer
func TokenValid(r *http.Request, token string) bool {
	given := r.Header.Get("X-API-Token")
	if given == "" {
		given = r.Header.Get("token")
	}
	if given == "" {
		if bearer, ok := strings.CutPrefix(r.Header.Get("Authorization"), "Bearer "); ok {
			given = bearer
		}
	}
	return token != "" && subtle.ConstantTimeCompare([]byte(given), []byte(token)) == 1
}

// AllowOrigins lets pages on other origins call a route, such as the web
// client on its dev server or hosted elsewhere. The routes it wraps need the
// token, sent as a header, and no cookies, so any origin may ask.
func AllowOrigins(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		if r.Method == http.MethodOptions {
			w.Header().Set("Access-Control-Allow-Methods", "GET, POST, DELETE")
			w.Header().Set("Access-Control-Allow-Headers", "Authorization, Content-Type, X-API-Token, token")
			w.Header().Set("Access-Control-Max-Age", "600")
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next(w, r)
	}
}

// writeJSON answers with a status and a value as JSON
func writeJSON(w http.ResponseWriter, status int, value any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	if err := json.NewEncoder(w).Encode(value); err != nil {
		slog.Error("Failed to encode response", "error", err)
	}
}

// writeError answers with a status and {"error": message}
func writeError(w http.ResponseWriter, status int, message string) {
	writeJSON(w, status, map[string]string{"error": message})
}
