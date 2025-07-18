package http

import (
	"encoding/json"
	"net/http"

	"log/slog"
)

type APIResponse struct {
	Status  string `json:"status"`
	Message string `json:"message"`
	Data    any    `json:"data,omitempty"`
}

// HandleAPI is the main handler for the /api endpoint
func HandleAPI(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		handleAPIGet(w, r)
	default:
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusMethodNotAllowed)
		if err := json.NewEncoder(w).Encode(map[string]string{"error": "Method not allowed"}); err != nil {
			slog.Error("Failed to encode response", "error", err)
		}
	}
}

func handleAPIGet(w http.ResponseWriter, _ *http.Request) {
	slog.Info("GET: /api")

	response := APIResponse{
		Status:  "success",
		Message: "API is running",
		Data:    map[string]any{},
	}

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(response); err != nil {
		slog.Error("Failed to encode response", "error", err)
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusInternalServerError)
		if err := json.NewEncoder(w).Encode(map[string]string{"error": "Internal server error"}); err != nil {
			slog.Error("Failed to encode response", "error", err)
		}
		return
	}
}
