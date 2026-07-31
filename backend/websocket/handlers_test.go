package websocket

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	gorillawebsocket "github.com/gorilla/websocket"
	"github.com/stretchr/testify/require"
	"github.com/timmo001/system-bridge/event"
	"github.com/timmo001/system-bridge/types"
)

const testAuthTimeout = 100 * time.Millisecond

func newTestWebsocketServer(t *testing.T) (*WebsocketServer, string) {
	t.Helper()

	ws := &WebsocketServer{
		token:         "test-token",
		authTimeout:   testAuthTimeout,
		connections:   make(map[string]*connectionInfo),
		dataListeners: make(map[string][]types.ModuleName),
		EventRouter:   event.NewMessageRouter(),
		upgrader: gorillawebsocket.Upgrader{
			CheckOrigin: func(_ *http.Request) bool { return true },
		},
	}
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if _, err := ws.HandleConnection(w, r); err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
		}
	}))
	t.Cleanup(server.Close)

	return ws, "ws" + strings.TrimPrefix(server.URL, "http")
}

func dialTestWebsocket(t *testing.T, url string) *gorillawebsocket.Conn {
	t.Helper()

	conn, response, err := gorillawebsocket.DefaultDialer.Dial(url, nil)
	if response != nil {
		t.Cleanup(func() {
			require.NoError(t, response.Body.Close())
		})
	}
	require.NoError(t, err)
	t.Cleanup(func() {
		require.NoError(t, conn.Close())
	})
	return conn
}

func requireNoConnections(t *testing.T, ws *WebsocketServer) {
	t.Helper()

	require.Eventually(t, func() bool {
		ws.mutex.RLock()
		defer ws.mutex.RUnlock()
		return len(ws.connections) == 0
	}, time.Second, 10*time.Millisecond)
}

func TestIdleConnectionClosesAfterAuthenticationTimeout(t *testing.T) {
	ws, url := newTestWebsocketServer(t)
	conn := dialTestWebsocket(t, url)

	_, _, err := conn.ReadMessage()
	require.Error(t, err)
	requireNoConnections(t, ws)
}

func TestAuthenticatedConnectionOutlivesAuthenticationTimeout(t *testing.T) {
	_, url := newTestWebsocketServer(t)
	conn := dialTestWebsocket(t, url)
	request := []byte(`{"id":"test","event":"UNKNOWN","token":"test-token"}`)

	require.NoError(t, conn.WriteMessage(gorillawebsocket.TextMessage, request))
	_, _, err := conn.ReadMessage()
	require.NoError(t, err)
	time.Sleep(2 * testAuthTimeout)
	require.NoError(t, conn.WriteMessage(gorillawebsocket.TextMessage, request))
	_, _, err = conn.ReadMessage()
	require.NoError(t, err)
}

func TestConnectionClosesWhenMessageExceedsLimit(t *testing.T) {
	ws, url := newTestWebsocketServer(t)
	conn := dialTestWebsocket(t, url)

	require.NoError(t, conn.WriteMessage(gorillawebsocket.TextMessage, make([]byte, maxMessageBytes+1)))
	_, _, err := conn.ReadMessage()
	require.Error(t, err)
	requireNoConnections(t, ws)
}
