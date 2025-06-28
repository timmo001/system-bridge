package http

import (
	"encoding/json"
	"net/http"

	"github.com/charmbracelet/log"
	"github.com/timmo001/system-bridge/data"
	"github.com/timmo001/system-bridge/types"
	"github.com/timmo001/system-bridge/utils"
)

// GetModuleDataHandler handles requests to get data for a specific module
func GetModuleDataHandler(dataStore *data.DataStore) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		expectedToken, err := utils.LoadToken()
		if err != nil {
			log.Errorf("Failed to load token for authentication: %v", err)
			http.Error(w, "Authentication error", http.StatusInternalServerError)
			return
		}

		// Check for API token in both X-API-Token and token headers
		token := r.Header.Get("X-API-Token")
		if token == "" {
			token = r.Header.Get("token")
		}
		if token != expectedToken {
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
		m, err := dataStore.GetModule(module)
		if err != nil {
			log.Info("GET: /api/data/:module", "module", module, "data", "not found")
			http.Error(w, "Module not found", http.StatusNotFound)
			return
		}

		log.Info("GET: /api/data/:module", "module", module)

		// Set response headers
		w.Header().Set("Content-Type", "application/json")

		// Write response
		if err := json.NewEncoder(w).Encode(m.Data); err != nil {
			log.Errorf("Error encoding response: %v", err)
			http.Error(w, "Internal server error", http.StatusInternalServerError)
			return
		}
	}
}
