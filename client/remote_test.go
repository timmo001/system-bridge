package client

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"net/url"
	"strconv"
	"testing"

	"github.com/stretchr/testify/require"
	"github.com/timmo001/system-bridge/keys"
)

func TestPairTargets(t *testing.T) {
	tests := []struct {
		name    string
		text    string
		options PairOptions
		code    string
		targets []string
		err     string
	}{
		{"a link", "http://desk.lan:9170/?pair=CODE", PairOptions{}, "CODE", []string{"http://desk.lan:9170"}, ""},
		{"a link's ip comes after its name", "http://desk.local:9170/?ip=192.0.2.10&pair=CODE", PairOptions{}, "CODE", []string{"http://desk.local:9170", "http://192.0.2.10:9170"}, ""},
		{"an IPv6 ip", "http://desk.local:9170/?ip=2001%3Adb8%3A%3A1&pair=CODE", PairOptions{}, "CODE", []string{"http://desk.local:9170", "http://[2001:db8::1]:9170"}, ""},
		{"a code with a host", " CODE ", PairOptions{Host: "desk.lan", Port: 9171, SSL: true}, "CODE", []string{"https://desk.lan:9171"}, ""},
		{"a code needs a host", "CODE", PairOptions{}, "", nil, "needs --host"},
		{"a link needs a code", "http://desk.lan:9170/", PairOptions{}, "", nil, "no pairing code"},
	}
	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			code, targets, err := pairTargets(test.text, test.options)
			if test.err != "" {
				require.ErrorContains(t, err, test.err)
				return
			}
			require.NoError(t, err)
			require.Equal(t, test.code, code)
			got := make([]string, 0, len(targets))
			for _, target := range targets {
				got = append(got, target.String())
			}
			require.Equal(t, test.targets, got)
		})
	}
}

// Pairing tries the next address when one doesn't answer, keeps the remote
// that answered, and replaces its key when paired again
func TestPair(t *testing.T) {
	t.Setenv("SYSTEM_BRIDGE_CONFIG_DIR", t.TempDir())

	var clientIDs []string
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		var request struct {
			Code   string `json:"code"`
			Client struct {
				ID       string `json:"id"`
				Platform string `json:"platform"`
			} `json:"client"`
		}
		require.NoError(t, json.NewDecoder(r.Body).Decode(&request))
		require.Equal(t, "/api/pair", r.URL.Path)
		require.Equal(t, "cli", request.Client.Platform)
		if request.Code != "CODE" {
			w.WriteHeader(http.StatusUnauthorized)
			return
		}
		clientIDs = append(clientIDs, request.Client.ID)
		key, err := keys.Generate(keys.KindClient)
		require.NoError(t, err)
		_ = json.NewEncoder(w).Encode(map[string]any{"token": key, "service": map[string]string{"id": "uuid", "name": "desk"}})
	}))
	t.Cleanup(server.Close)
	address, err := url.Parse(server.URL)
	require.NoError(t, err)

	// Nothing listens on port 1, so the link's own address doesn't answer
	link := "http://127.0.0.1:1/?" + url.Values{"pair": {"CODE"}, "ip": {address.Hostname()}}.Encode()
	_, err = Pair(context.Background(), link, PairOptions{Port: 1})
	require.ErrorContains(t, err, "could not reach")

	first, err := Pair(context.Background(), "CODE", PairOptions{Host: address.Hostname(), Port: mustPort(t, address)})
	require.NoError(t, err)
	require.Equal(t, "desk", first.Name)
	require.Equal(t, server.URL, first.URL)

	again, err := Pair(context.Background(), server.URL+"/?pair=CODE", PairOptions{})
	require.NoError(t, err)
	require.NotEqual(t, first.Key, again.Key)

	remotes, err := Remotes()
	require.NoError(t, err)
	require.Len(t, remotes, 1)
	require.Equal(t, again.Key, remotes[0].Key)
	require.Equal(t, clientIDs[0], clientIDs[1], "pairing again should keep this computer's client ID")

	_, err = Pair(context.Background(), server.URL+"/?pair=USED", PairOptions{})
	require.ErrorContains(t, err, "used or has expired")

	found, err := FindRemote("DESK")
	require.NoError(t, err)
	require.Equal(t, "uuid", found.ID)

	backend, err := BackendFor(WithRemote(context.Background(), "desk"))
	require.NoError(t, err)
	require.Equal(t, "ws://"+address.Host+"/api/websocket", backend.WebSocket())

	_, err = RemoveRemote("uuid")
	require.NoError(t, err)
	_, err = FindRemote("desk")
	require.ErrorContains(t, err, "no paired remote")
}

func mustPort(t *testing.T, address *url.URL) int {
	t.Helper()
	port, err := strconv.Atoi(address.Port())
	require.NoError(t, err)
	return port
}
