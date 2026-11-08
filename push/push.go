// Package push keeps the phones and browsers subscribed to System Bridge's
// pushes and sends them, on Groundwork's push contract: Web Push with VAPID,
// which reaches the browser's push service and a UnifiedPush endpoint alike.
package push

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"path/filepath"
	"slices"
	"strings"
	"sync"
	"time"

	webpush "github.com/SherClockHolmes/webpush-go"

	"github.com/timmo001/system-bridge/utils"
)

// Kind is what a push is about. Each phone chooses the kinds it gets.
type Kind string

const (
	// KindNotifications mirrors the notifications System Bridge shows
	KindNotifications Kind = "notifications"
	// KindUpdates says a new System Bridge release is out
	KindUpdates Kind = "updates"
	// KindPower says the computer is going to sleep or shutting down
	KindPower Kind = "power"
)

// Kinds is every kind, which a new subscription starts with
var Kinds = []Kind{KindNotifications, KindUpdates, KindPower}

// ErrNotFound is returned for a client with no subscription
var ErrNotFound = errors.New("no subscription for that client")

// subscriber names System Bridge to push services in the VAPID token
const subscriber = "https://github.com/timmo001/system-bridge"

// Client is who a subscription belongs to, so one client has one
type Client struct {
	ID       string `json:"id"`
	Name     string `json:"name"`
	Platform string `json:"platform"`
}

// Subscription is a phone or browser's push endpoint and keys
type Subscription struct {
	Endpoint string       `json:"endpoint"`
	Keys     webpush.Keys `json:"keys"`
	Client   Client       `json:"client"`
	// Origin is where the client subscribed from, such as
	// http://192.168.1.5:9170, so a push's link opens on the address that
	// client knows this computer by
	Origin  string    `json:"origin"`
	Kinds   []Kind    `json:"kinds"`
	Created time.Time `json:"created"`
}

// Payload is the push contract's PushPayload
type Payload struct {
	Title string `json:"title"`
	Body  string `json:"body,omitempty"`
	Tone  string `json:"tone,omitempty"`
	// Link is a path in the web client, such as /system, made absolute with
	// each subscription's origin
	Link  string `json:"link,omitempty"`
	Tag   string `json:"tag,omitempty"`
	Level string `json:"level,omitempty"`
}

type vapidKeys struct {
	Public  string `json:"public"`
	Private string `json:"private"`
}

// state is what push.json keeps
type state struct {
	VAPID         vapidKeys      `json:"vapid"`
	Subscriptions []Subscription `json:"subscriptions"`
	// LastUpdate is the release last pushed, so each goes out once
	LastUpdate string `json:"lastUpdate,omitempty"`
}

// Store keeps the subscriptions and VAPID keys in push.json
type Store struct {
	mu    sync.Mutex
	path  string
	state state
	// client sends the pushes; nil uses http.DefaultClient
	client webpush.HTTPClient
}

// Load opens push.json in the config directory, making the VAPID keys the
// first time
func Load() (*Store, error) {
	configPath, err := utils.GetConfigPath()
	if err != nil {
		return nil, fmt.Errorf("could not get config path: %v", err)
	}
	return open(filepath.Join(configPath, "push.json"))
}

func open(path string) (*Store, error) {
	s := &Store{path: path}
	data, err := os.ReadFile(path)
	switch {
	case err == nil:
		if err := json.Unmarshal(data, &s.state); err != nil {
			return nil, fmt.Errorf("could not read %s: %v", path, err)
		}
	case !errors.Is(err, os.ErrNotExist):
		return nil, fmt.Errorf("could not read %s: %v", path, err)
	}

	if s.state.VAPID.Public == "" || s.state.VAPID.Private == "" {
		private, public, err := webpush.GenerateVAPIDKeys()
		if err != nil {
			return nil, fmt.Errorf("could not make VAPID keys: %v", err)
		}
		s.state.VAPID = vapidKeys{Public: public, Private: private}
		if err := s.save(); err != nil {
			return nil, err
		}
		slog.Info("Made the VAPID keys for push")
	}
	return s, nil
}

// save writes push.json; the caller holds mu, or nothing else has s yet
func (s *Store) save() error {
	data, err := json.MarshalIndent(s.state, "", "  ")
	if err != nil {
		return fmt.Errorf("could not encode push state: %v", err)
	}
	// Written beside it and renamed, so a crash never leaves half a file
	temp := s.path + ".tmp"
	if err := os.WriteFile(temp, data, 0600); err != nil {
		return fmt.Errorf("could not write %s: %v", temp, err)
	}
	if err := os.Rename(temp, s.path); err != nil {
		return fmt.Errorf("could not replace %s: %v", s.path, err)
	}
	return nil
}

// PublicKey is the VAPID public key clients subscribe with
func (s *Store) PublicKey() string {
	s.mu.Lock()
	defer s.mu.Unlock()
	return s.state.VAPID.Public
}

// Subscribe keeps a subscription, replacing the client's last one or one
// with the same endpoint. A client subscribing again keeps the kinds it chose.
func (s *Store) Subscribe(sub Subscription) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	sub.Kinds = slices.Clone(Kinds)
	sub.Created = time.Now()
	kept := make([]Subscription, 0, len(s.state.Subscriptions)+1)
	for _, existing := range s.state.Subscriptions {
		if existing.Client.ID == sub.Client.ID || existing.Endpoint == sub.Endpoint {
			if existing.Client.ID == sub.Client.ID {
				sub.Kinds = existing.Kinds
			}
			continue
		}
		kept = append(kept, existing)
	}
	s.state.Subscriptions = append(kept, sub)
	return s.save()
}

// Unsubscribe drops the subscription with this endpoint
func (s *Store) Unsubscribe(endpoint string) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	s.state.Subscriptions = slices.DeleteFunc(s.state.Subscriptions, func(sub Subscription) bool {
		return sub.Endpoint == endpoint
	})
	return s.save()
}

// SetKinds sets which kinds a client gets
func (s *Store) SetKinds(clientID string, kinds []Kind) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	index := slices.IndexFunc(s.state.Subscriptions, func(sub Subscription) bool {
		return sub.Client.ID == clientID
	})
	if index == -1 {
		return ErrNotFound
	}
	s.state.Subscriptions[index].Kinds = slices.Clone(kinds)
	return s.save()
}

// List is every subscription
func (s *Store) List() []Subscription {
	s.mu.Lock()
	defer s.mu.Unlock()
	return slices.Clone(s.state.Subscriptions)
}

// MarkUpdate records a release as pushed, and says whether it was new
func (s *Store) MarkUpdate(release string) bool {
	s.mu.Lock()
	defer s.mu.Unlock()

	if s.state.LastUpdate == release {
		return false
	}
	s.state.LastUpdate = release
	if err := s.save(); err != nil {
		slog.Warn("Failed to save the last pushed update", "error", err)
	}
	return true
}

// Send pushes the payload to every subscription that takes this kind, all
// at once, and returns once each has been tried. A subscription whose
// endpoint answers 404 or 410 is gone, so it's dropped.
func (s *Store) Send(ctx context.Context, kind Kind, payload Payload) {
	s.mu.Lock()
	keys := s.state.VAPID
	targets := slices.DeleteFunc(slices.Clone(s.state.Subscriptions), func(sub Subscription) bool {
		return !slices.Contains(sub.Kinds, kind)
	})
	s.mu.Unlock()

	var (
		wg       sync.WaitGroup
		goneMu   sync.Mutex
		gone     []string
		urgency  = webpush.UrgencyNormal
		httpUsed = s.client
	)
	if kind == KindPower {
		// It has to arrive before the computer goes down
		urgency = webpush.UrgencyHigh
	}
	if httpUsed == nil {
		httpUsed = http.DefaultClient
	}

	for _, sub := range targets {
		wg.Go(func() {
			message := payload
			if strings.HasPrefix(message.Link, "/") && sub.Origin != "" {
				message.Link = strings.TrimSuffix(sub.Origin, "/") + message.Link
			}
			body, err := json.Marshal(message)
			if err != nil {
				slog.Warn("Failed to encode a push", "error", err)
				return
			}
			response, err := webpush.SendNotificationWithContext(ctx, body,
				&webpush.Subscription{Endpoint: sub.Endpoint, Keys: sub.Keys},
				&webpush.Options{
					HTTPClient:      httpUsed,
					Subscriber:      subscriber,
					TTL:             3600,
					Urgency:         urgency,
					VAPIDPublicKey:  keys.Public,
					VAPIDPrivateKey: keys.Private,
				})
			if err != nil {
				slog.Warn("Failed to send a push", "client", sub.Client.Name, "error", err)
				return
			}
			if err := response.Body.Close(); err != nil {
				slog.Debug("Failed to close a push response", "error", err)
			}
			switch {
			case response.StatusCode == http.StatusNotFound || response.StatusCode == http.StatusGone:
				goneMu.Lock()
				gone = append(gone, sub.Endpoint)
				goneMu.Unlock()
			case response.StatusCode >= 300:
				slog.Warn("A push service refused a push", "client", sub.Client.Name, "status", response.StatusCode)
			}
		})
	}
	wg.Wait()

	if len(gone) == 0 {
		return
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	s.state.Subscriptions = slices.DeleteFunc(s.state.Subscriptions, func(sub Subscription) bool {
		return slices.Contains(gone, sub.Endpoint)
	})
	slog.Info("Dropped push subscriptions that are gone", "count", len(gone))
	if err := s.save(); err != nil {
		slog.Warn("Failed to save push subscriptions", "error", err)
	}
}
