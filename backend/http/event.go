package http

import (
	"encoding/json"
	"net/http"

	"github.com/google/uuid"

	"github.com/timmo001/system-bridge/event"
)

// EventHandler runs one event, as the WebSocket would, so something that
// only speaks HTTP, such as a quick settings tile, can lock or sleep the
// computer. It needs the same token and goes through the same handlers.
func EventHandler(token string, router *event.MessageRouter) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			w.Header().Set("Allow", http.MethodPost)
			writeError(w, http.StatusMethodNotAllowed, "Method not allowed")
			return
		}
		if !TokenValid(r, token) {
			writeError(w, http.StatusUnauthorized, "Invalid API token")
			return
		}
		var body struct {
			Event event.EventType `json:"event"`
			Data  any             `json:"data"`
		}
		if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, maxBodyBytes)).Decode(&body); err != nil || body.Event == "" {
			writeError(w, http.StatusBadRequest, "Invalid event")
			return
		}
		// A data listener needs a WebSocket to send the data down
		if body.Event == event.EventRegisterDataListener || body.Event == event.EventUnregisterDataListener {
			writeError(w, http.StatusBadRequest, "Data listeners need the WebSocket")
			return
		}
		if body.Data == nil {
			body.Data = map[string]any{}
		}
		response := router.HandleMessage("http:"+r.RemoteAddr, event.Message{
			ID:    uuid.NewString(),
			Event: body.Event,
			Data:  body.Data,
		})
		writeJSON(w, http.StatusOK, response)
	}
}
