package http

import (
	"encoding/json"
	"net/http"

	"github.com/charmbracelet/log"
	data_module "github.com/timmo001/system-bridge/backend/data/module"
	"github.com/timmo001/system-bridge/backend/event"
)

// GetModuleDataHandler handles requests to get data for a specific module
func GetModuleDataHandler(router *event.MessageRouter) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		// Check for API token in both X-API-Token and token headers
		token := r.Header.Get("X-API-Token")
		if token == "" {
			token = r.Header.Get("token")
		}
		if token != router.Settings.API.Token {
			http.Error(w, "Invalid API token", http.StatusUnauthorized)
			return
		}

		// Get module name from URL path
		module := data_module.ModuleName(r.URL.Path[len("/api/data/"):])

		// Validate module name
		if module == "" {
			http.Error(w, "Module name is required", http.StatusBadRequest)
			return
		}

		// Get module data
		data := router.DataStore.GetModuleData(module)
		if data == nil {
			http.Error(w, "Module not found", http.StatusNotFound)
			return
		}

		// Set response headers
		w.Header().Set("Content-Type", "application/json")

		// Write response
		if err := json.NewEncoder(w).Encode(data); err != nil {
			log.Errorf("Error encoding response: %v", err)
			http.Error(w, "Internal server error", http.StatusInternalServerError)
			return
		}
	}
}

