package auth

import (
	"encoding/json"
	"net/http"
	"strings"
)

type Validator struct {
	token string
}

type RequestTokenOptions struct {
	AllowQuery bool
}

func NewValidator(token string) *Validator {
	return &Validator{token: token}
}

func (v *Validator) ValidateToken(token string) bool {
	return token != "" && token == v.token
}

func TokenFromRequest(r *http.Request, options RequestTokenOptions) string {
	if token := TokenFromAuthorizationHeader(r.Header.Get("Authorization")); token != "" {
		return token
	}

	if token := r.Header.Get("X-API-Token"); token != "" {
		return token
	}

	if token := r.Header.Get("token"); token != "" {
		return token
	}

	if options.AllowQuery {
		return r.URL.Query().Get("token")
	}

	return ""
}

func TokenFromAuthorizationHeader(value string) string {
	if value == "" {
		return ""
	}

	prefix, token, ok := strings.Cut(value, " ")
	if !ok || !strings.EqualFold(prefix, "Bearer") {
		return ""
	}

	return strings.TrimSpace(token)
}

func WriteAuthenticationError(w http.ResponseWriter) {
	writeJSONError(w, http.StatusInternalServerError, "Authentication error")
}

func WriteUnauthorized(w http.ResponseWriter) {
	writeJSONError(w, http.StatusUnauthorized, "Invalid API token")
}

func writeJSONError(w http.ResponseWriter, status int, message string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(map[string]string{"error": message})
}
