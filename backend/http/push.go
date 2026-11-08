package http

import (
	"encoding/json"
	"errors"
	"log/slog"
	"net/http"
	"net/url"
	"slices"
	"time"

	"github.com/timmo001/system-bridge/push"
)

// PushVAPIDKeyHandler answers the VAPID public key clients subscribe with
func PushVAPIDKeyHandler(token string, store *push.Store) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			w.Header().Set("Allow", http.MethodGet)
			writeError(w, http.StatusMethodNotAllowed, "Method not allowed")
			return
		}
		if !TokenValid(r, token) {
			writeError(w, http.StatusUnauthorized, "Invalid API token")
			return
		}
		writeJSON(w, http.StatusOK, map[string]string{"publicKey": store.PublicKey()})
	}
}

// pushSubscriptionInfo is a subscription as the phones list shows it, with
// no endpoint URL or keys
type pushSubscriptionInfo struct {
	Client       push.Client `json:"client"`
	Kinds        []push.Kind `json:"kinds"`
	Created      time.Time   `json:"created"`
	EndpointHost string      `json:"endpointHost"`
}

// requestOrigin is where a request came from, so a push's link opens on the
// address that client knows this computer by. The browser's Origin header
// wins, as it's right behind a reverse proxy too.
func requestOrigin(r *http.Request) string {
	if origin := r.Header.Get("Origin"); origin != "" && origin != "null" {
		return origin
	}
	scheme := "http"
	if r.TLS != nil {
		scheme = "https"
	}
	return scheme + "://" + r.Host
}

// PushSubscriptionsHandler lists (GET), keeps (POST) and drops (DELETE) push
// subscriptions, on Groundwork's push contract
func PushSubscriptionsHandler(token string, store *push.Store) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if !TokenValid(r, token) {
			writeError(w, http.StatusUnauthorized, "Invalid API token")
			return
		}
		switch r.Method {
		case http.MethodGet:
			subscriptions := store.List()
			infos := make([]pushSubscriptionInfo, 0, len(subscriptions))
			for _, sub := range subscriptions {
				info := pushSubscriptionInfo{Client: sub.Client, Kinds: sub.Kinds, Created: sub.Created}
				if endpoint, err := url.Parse(sub.Endpoint); err == nil {
					info.EndpointHost = endpoint.Host
				}
				infos = append(infos, info)
			}
			writeJSON(w, http.StatusOK, infos)

		case http.MethodPost:
			var sub push.Subscription
			if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, maxBodyBytes)).Decode(&sub); err != nil {
				writeError(w, http.StatusBadRequest, "Invalid push subscription")
				return
			}
			// A UnifiedPush distributor on the LAN, such as ntfy, can be http
			if endpoint, err := url.Parse(sub.Endpoint); err != nil || (endpoint.Scheme != "https" && endpoint.Scheme != "http") ||
				sub.Keys.P256dh == "" || sub.Keys.Auth == "" || sub.Client.ID == "" {
				writeError(w, http.StatusBadRequest, "Invalid push subscription")
				return
			}
			sub.Origin = requestOrigin(r)
			if err := store.Subscribe(sub); err != nil {
				slog.Error("Failed to keep a push subscription", "error", err)
				writeError(w, http.StatusInternalServerError, "Failed to keep the subscription")
				return
			}
			slog.Info("Push subscription added", "client", sub.Client.Name, "platform", sub.Client.Platform)
			w.WriteHeader(http.StatusNoContent)

		case http.MethodDelete:
			// The client unsubscribing knows its endpoint; the phones list
			// only knows the client
			var body struct {
				Endpoint string `json:"endpoint"`
				ClientID string `json:"clientId"`
			}
			if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, maxBodyBytes)).Decode(&body); err != nil || (body.Endpoint == "" && body.ClientID == "") {
				writeError(w, http.StatusBadRequest, "Invalid request")
				return
			}
			var err error
			if body.Endpoint != "" {
				err = store.Unsubscribe(body.Endpoint)
			} else {
				err = store.UnsubscribeClient(body.ClientID)
			}
			if err != nil {
				slog.Error("Failed to drop a push subscription", "error", err)
				writeError(w, http.StatusInternalServerError, "Failed to drop the subscription")
				return
			}
			w.WriteHeader(http.StatusNoContent)

		default:
			w.Header().Set("Allow", "GET, POST, DELETE")
			writeError(w, http.StatusMethodNotAllowed, "Method not allowed")
		}
	}
}

// PushPreferencesHandler sets which kinds of push a client gets
func PushPreferencesHandler(token string, store *push.Store) http.HandlerFunc {
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
			ClientID string      `json:"clientId"`
			Kinds    []push.Kind `json:"kinds"`
		}
		if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, maxBodyBytes)).Decode(&body); err != nil || body.ClientID == "" {
			writeError(w, http.StatusBadRequest, "Invalid request")
			return
		}
		for _, kind := range body.Kinds {
			if !slices.Contains(push.Kinds, kind) {
				writeError(w, http.StatusBadRequest, "Unknown kind: "+string(kind))
				return
			}
		}
		if body.Kinds == nil {
			body.Kinds = []push.Kind{}
		}
		switch err := store.SetKinds(body.ClientID, body.Kinds); {
		case errors.Is(err, push.ErrNotFound):
			writeError(w, http.StatusNotFound, "No subscription for that client")
		case err != nil:
			slog.Error("Failed to save push preferences", "error", err)
			writeError(w, http.StatusInternalServerError, "Failed to save the preferences")
		default:
			w.WriteHeader(http.StatusNoContent)
		}
	}
}
