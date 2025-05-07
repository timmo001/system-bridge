package http

import (
	"encoding/json"
	"net/http"

	"github.com/charmbracelet/log"
	"github.com/timmo001/system-bridge/data"
	"github.com/timmo001/system-bridge/settings"
	"github.com/timmo001/system-bridge/types"
)

// GetModuleDataHandler handles requests to get data for a specific module
func GetModuleDataHandler(settings *settings.Settings, dataStore *data.DataStore) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		// Check for API token in both X-API-Token and token headers
		token := r.Header.Get("X-API-Token")
		if token == "" {
			token = r.Header.Get("token")
		}
		if token != settings.API.Token {
			http.Error(w, "Invalid API token", http.StatusUnauthorized)
			return
		}

		// Get module name from URL path
		module := types.ModuleName(r.URL.Path[len("/api/data/"):])

		// Validate module name
		if module == "" {
			http.Error(w, "Module name is required", http.StatusBadRequest)
			return
		}

		// Get module data
		meta, err := dataStore.GetModule(module)
		if err != nil {
			log.Info("GET: /api/data/:module", "module", module, "data", "not found")
			http.Error(w, "Module not found", http.StatusNotFound)
			return
		}

		log.Info("GET: /api/data/:module", "module", module)

		// Set response headers
		w.Header().Set("Content-Type", "application/json")

		// Write response
		if err := json.NewEncoder(w).Encode(meta.Data); err != nil {
			log.Errorf("Error encoding response: %v", err)
			http.Error(w, "Internal server error", http.StatusInternalServerError)
			return
		}
	}
}
