package http

import (
	"encoding/json"
	"net/http"

	"log/slog"

	backend_auth "github.com/timmo001/system-bridge/backend/auth"
	"github.com/timmo001/system-bridge/data"
	"github.com/timmo001/system-bridge/types"
)

// GetModuleDataHandler handles requests to get data for a specific module
func GetModuleDataHandler(dataStore *data.DataStore, validator *backend_auth.Validator) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		token := backend_auth.TokenFromRequest(r, backend_auth.RequestTokenOptions{})
		if !validator.ValidateToken(token) {
			backend_auth.WriteUnauthorized(w)
			return
		}

		// Get module name from URL path
		module := types.ModuleName(r.URL.Path[len("/api/data/"):])

		// Validate module name
		if module == "" {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusBadRequest)
			if err := json.NewEncoder(w).Encode(map[string]string{"error": "Module name is required"}); err != nil {
				slog.Error("Failed to encode response", "error", err)
			}
			return
		}

		// Get module data
		m, err := dataStore.GetModule(module)
		if err != nil {
			slog.Info("GET: /api/data/:module", "module", module, "data", "not found")
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusNotFound)
			if err := json.NewEncoder(w).Encode(map[string]string{"error": "Module not found"}); err != nil {
				slog.Error("Failed to encode response", "error", err)
			}
			return
		}

		slog.Info("GET: /api/data/:module", "module", module)

		// Set response headers
		w.Header().Set("Content-Type", "application/json")

		// Write response
		if err := json.NewEncoder(w).Encode(m.Data); err != nil {
			slog.Error("Error encoding response", "error", err)
			http.Error(w, "Internal server error", http.StatusInternalServerError)
			return
		}
	}
}
