package client

import (
	"context"
	"errors"
	"fmt"
	"net/url"

	"github.com/timmo001/system-bridge/keys"
	"github.com/timmo001/system-bridge/utils"
)

type remoteKey struct{}

// WithRemote sends the client's calls under ctx to a paired remote, by its
// ID, name or host, rather than this computer's backend. It's looked up when
// a call is made, so commands that never call a backend don't need it paired.
func WithRemote(ctx context.Context, name string) context.Context {
	if name == "" {
		return ctx
	}
	return context.WithValue(ctx, remoteKey{}, name)
}

// RemoteName is the remote the client's calls under ctx go to, or "" for
// this computer's backend
func RemoteName(ctx context.Context) string {
	name, _ := ctx.Value(remoteKey{}).(string)
	return name
}

// Backend is the System Bridge the client calls: this computer's, signed in
// with the owner key, or a paired remote's, signed in with the key it gave
type Backend struct {
	// URL is its scheme and host, such as http://127.0.0.1:9170
	URL url.URL
	Key string
}

// BackendFor is the backend the client's calls under ctx go to
func BackendFor(ctx context.Context) (Backend, error) {
	if name := RemoteName(ctx); name != "" {
		remote, err := FindRemote(name)
		if err != nil {
			return Backend{}, err
		}
		parsed, err := url.Parse(remote.URL)
		if err != nil || parsed.Host == "" {
			return Backend{}, fmt.Errorf("the paired remote %s has no usable address: pair it again", remote.Name)
		}
		return Backend{URL: url.URL{Scheme: parsed.Scheme, Host: parsed.Host}, Key: remote.Key}, nil
	}
	key, err := keys.LoadOwnerKey()
	if err != nil {
		return Backend{}, err
	}
	return Backend{URL: url.URL{Scheme: "http", Host: fmt.Sprintf("127.0.0.1:%d", utils.GetPort())}, Key: key}, nil
}

// HTTP is the address of one of the backend's HTTP routes
func (b Backend) HTTP(path string) string {
	address := b.URL
	address.Path = path
	return address.String()
}

// WebSocket is the address of the backend's WebSocket
func (b Backend) WebSocket() string {
	address := b.URL
	address.Scheme = "ws"
	if b.URL.Scheme == "https" {
		address.Scheme = "wss"
	}
	address.Path = "/api/websocket"
	return address.String()
}

// ErrBadKey is the backend turning down the key it was signed in with
var ErrBadKey = errors.New("the key was turned down")

// Rejected says the backend turned down the key, and how to get a new one,
// or is err unchanged for any other error
func (b Backend) Rejected(err error) error {
	if !errors.Is(err, ErrBadKey) {
		return err
	}
	if b.URL.Hostname() == "127.0.0.1" {
		return fmt.Errorf("%w: make a new owner key with system-bridge client key owner --replace", ErrBadKey)
	}
	return fmt.Errorf("%w at %s, perhaps removed under Settings > Devices there: pair with it again with system-bridge client remote pair", ErrBadKey, b.URL.Host)
}

// Unreachable says the backend didn't answer, naming which one
func (b Backend) Unreachable(err error) error {
	if b.URL.Hostname() == "127.0.0.1" {
		return fmt.Errorf("could not reach the System Bridge backend (is it running?): %w", err)
	}
	return fmt.Errorf("could not reach System Bridge at %s: %w", b.URL.Host, err)
}
