package push

import (
	"context"
	"crypto/ecdh"
	"crypto/rand"
	"encoding/base64"
	"net/http"
	"net/http/httptest"
	"path/filepath"
	"testing"

	webpush "github.com/SherClockHolmes/webpush-go"
)

// subscriptionAt is a subscription with real keys, as the sender encrypts
// for them, at an endpoint answering with status
func subscriptionAt(t *testing.T, id string, status int) Subscription {
	t.Helper()
	endpoint := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(status)
	}))
	t.Cleanup(endpoint.Close)

	key, err := ecdh.P256().GenerateKey(rand.Reader)
	if err != nil {
		t.Fatal(err)
	}
	auth := make([]byte, 16)
	if _, err := rand.Read(auth); err != nil {
		t.Fatal(err)
	}
	return Subscription{
		Endpoint: endpoint.URL,
		Keys: webpush.Keys{
			P256dh: base64.RawURLEncoding.EncodeToString(key.PublicKey().Bytes()),
			Auth:   base64.RawURLEncoding.EncodeToString(auth),
		},
		Client: Client{ID: id, Name: id, Platform: "android"},
	}
}

func TestSendDropsGoneSubscriptions(t *testing.T) {
	store, err := open(filepath.Join(t.TempDir(), "push.json"))
	if err != nil {
		t.Fatal(err)
	}
	for _, sub := range []Subscription{
		subscriptionAt(t, "gone", http.StatusGone),
		subscriptionAt(t, "failing", http.StatusInternalServerError),
		subscriptionAt(t, "working", http.StatusCreated),
	} {
		if err := store.Subscribe(sub); err != nil {
			t.Fatal(err)
		}
	}

	store.Send(context.Background(), KindUpdates, Payload{Title: "System Bridge 5.28.0 is out"})

	kept := map[string]bool{}
	for _, sub := range store.List() {
		kept[sub.Client.ID] = true
	}
	if kept["gone"] || !kept["failing"] || !kept["working"] {
		t.Errorf("kept %v, want failing and working only", kept)
	}

	// And it stays that way after loading again
	reloaded, err := open(store.path)
	if err != nil {
		t.Fatal(err)
	}
	if got := len(reloaded.List()); got != 2 {
		t.Errorf("reloaded %d subscriptions, want 2", got)
	}
}
