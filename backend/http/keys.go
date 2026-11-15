package http

import (
	"encoding/json"
	"log/slog"
	"net/http"
	"strings"

	"github.com/google/uuid"

	"github.com/timmo001/system-bridge/keys"
)

// newKey is a key as it is handed out: the key itself, shown once, and the
// client it is for
type newKey struct {
	Key    string      `json:"key"`
	Client keys.Client `json:"client"`
}

func decodeClient(w http.ResponseWriter, r *http.Request) (keys.Client, bool) {
	var body struct {
		Client keys.Client `json:"client"`
	}
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, maxBodyBytes)).Decode(&body); err != nil ||
		body.Client.ID == "" || strings.TrimSpace(body.Client.Name) == "" || body.Client.Kind == "" {
		writeError(w, http.StatusBadRequest, "Invalid client")
		return keys.Client{}, false
	}
	return body.Client, true
}

// KeyExchangeHandler trades the old shared token for the calling client's own
// key. It is the only route that takes the shared token alone.
func KeyExchangeHandler(auth *keys.Auth) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			w.Header().Set("Allow", http.MethodPost)
			writeError(w, http.StatusMethodNotAllowed, "Method not allowed")
			return
		}
		if !auth.SharedToken(keys.ReadBearer(r)) {
			writeError(w, http.StatusUnauthorized, "Invalid API token")
			return
		}
		client, ok := decodeClient(w, r)
		if !ok {
			return
		}
		key, err := auth.Store.Create(client)
		if err != nil {
			slog.Error("Failed to make a client key", "error", err)
			writeError(w, http.StatusInternalServerError, "Failed to make a key")
			return
		}
		slog.Info("Exchanged the shared token for a client key", "name", client.Name, "kind", client.Kind)
		writeJSON(w, http.StatusOK, newKey{Key: key, Client: client})
	}
}

// KeysHandler lists the clients with a key (GET), makes a key by hand (POST
// with a name) and removes one (DELETE with an id). They need a key.
func KeysHandler(auth *keys.Auth) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if !auth.ValidOrShared(r) {
			writeError(w, http.StatusUnauthorized, "Invalid key")
			return
		}
		switch r.Method {
		case http.MethodGet:
			infos, err := auth.Store.List()
			if err != nil {
				writeError(w, http.StatusInternalServerError, "Failed to read the keys")
				return
			}
			writeJSON(w, http.StatusOK, map[string]any{"clients": infos})
		case http.MethodPost:
			var body struct {
				Name string `json:"name"`
			}
			if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, maxBodyBytes)).Decode(&body); err != nil || strings.TrimSpace(body.Name) == "" {
				writeError(w, http.StatusBadRequest, "A key needs a name")
				return
			}
			client := keys.Client{ID: uuid.NewString(), Name: strings.TrimSpace(body.Name), Kind: "key"}
			key, err := auth.Store.Create(client)
			if err != nil {
				slog.Error("Failed to make a client key", "error", err)
				writeError(w, http.StatusInternalServerError, "Failed to make a key")
				return
			}
			writeJSON(w, http.StatusOK, newKey{Key: key, Client: client})
		case http.MethodDelete:
			id := r.URL.Query().Get("id")
			if id == "" {
				writeError(w, http.StatusBadRequest, "A key to remove needs an id")
				return
			}
			if err := auth.Store.Remove(id); err != nil {
				status := http.StatusInternalServerError
				if err == keys.ErrNotFound {
					status = http.StatusNotFound
				}
				writeError(w, status, "Failed to remove the key")
				return
			}
			w.WriteHeader(http.StatusNoContent)
		default:
			w.Header().Set("Allow", "GET, POST, DELETE")
			writeError(w, http.StatusMethodNotAllowed, "Method not allowed")
		}
	}
}
