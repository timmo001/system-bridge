package http

import (
	"encoding/json"
	"net/http"

	"github.com/charmbracelet/log"
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
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
	}
}

func handleAPIGet(w http.ResponseWriter, _ *http.Request) {
	log.Info("GET: /api")

	response := APIResponse{
		Status:  "success",
		Message: "API is running",
		Data:    map[string]any{},
	}

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(response); err != nil {
		log.Error("Failed to encode response", "error", err)
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}
}
