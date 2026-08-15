package client

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/gorilla/websocket"
	"github.com/stretchr/testify/require"
	"github.com/timmo001/system-bridge/event"
	"github.com/timmo001/system-bridge/types"
)

const testToken = "secret-test-token"

type watchServer struct {
	url      string
	requests <-chan websocketRequest
}

func newWatchServer(t *testing.T, handler func(*websocket.Conn, websocketRequest)) watchServer {
	t.Helper()

	requests := make(chan websocketRequest, 1)
	upgrader := websocket.Upgrader{CheckOrigin: func(_ *http.Request) bool { return true }}
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		conn, err := upgrader.Upgrade(w, r, nil)
		if err != nil {
			t.Errorf("upgrade websocket: %v", err)
			return
		}
		defer func() { _ = conn.Close() }()

		var register websocketRequest
		if err := conn.ReadJSON(&register); err != nil {
			return
		}
		requests <- register
		handler(conn, register)
	}))
	t.Cleanup(server.Close)

	return watchServer{
		url:      "ws" + strings.TrimPrefix(server.URL, "http"),
		requests: requests,
	}
}

func watchOptions(server watchServer, writer io.Writer, modules ...types.ModuleName) WatchOptions {
	return WatchOptions{
		Modules: modules,
		Writer:  writer,
		url:     server.url,
		loadToken: func() (string, error) {
			return testToken, nil
		},
	}
}

func acknowledgeRegistration(t *testing.T, conn *websocket.Conn, register websocketRequest) {
	t.Helper()
	require.NoError(t, conn.WriteJSON(event.MessageResponse{
		ID:      register.ID,
		Type:    event.ResponseTypeDataListenerRegistered,
		Subtype: event.ResponseSubtypeNone,
	}))
}

func TestWatchRegistersBeforeRequestingDataAndStreamsOnlyUpdates(t *testing.T) {
	var output bytes.Buffer
	server := newWatchServer(t, func(conn *websocket.Conn, register websocketRequest) {
		acknowledgeRegistration(t, conn, register)

		var getData websocketRequest
		require.NoError(t, conn.ReadJSON(&getData))
		require.Equal(t, event.EventGetData, getData.Event)
		require.Equal(t, []types.ModuleName{types.ModuleCPU, types.ModuleMemory}, getData.Data.Modules)
		require.Equal(t, testToken, getData.Token)

		require.NoError(t, conn.WriteJSON(event.MessageResponse{
			ID:      getData.ID,
			Type:    event.ResponseTypeDataGet,
			Subtype: event.ResponseSubtypeNone,
		}))
		require.NoError(t, conn.WriteJSON(event.MessageResponse{
			ID:      "system",
			Type:    event.ResponseTypeDataUpdate,
			Subtype: event.ResponseSubtypeNone,
			Module:  types.ModuleSystem,
			Data:    map[string]any{"hostname": "unrequested"},
		}))
		require.NoError(t, conn.WriteJSON(event.MessageResponse{
			ID:      "system",
			Type:    event.ResponseTypeDataUpdate,
			Subtype: event.ResponseSubtypeNone,
			Module:  types.ModuleCPU,
			Data:    map[string]any{"usage": 12.5},
		}))
		require.NoError(t, conn.WriteControl(
			websocket.CloseMessage,
			websocket.FormatCloseMessage(websocket.CloseNormalClosure, "finished"),
			time.Now().Add(time.Second),
		))
	})

	err := Watch(context.Background(), watchOptions(server, &output, types.ModuleCPU, types.ModuleMemory))
	require.ErrorContains(t, err, "read data websocket")
	require.NotContains(t, output.String(), testToken)

	var update event.MessageResponse
	require.NoError(t, json.Unmarshal(bytes.TrimSpace(output.Bytes()), &update))
	require.Equal(t, event.ResponseTypeDataUpdate, update.Type)
	require.Equal(t, types.ModuleCPU, update.Module)
	require.Equal(t, 1, bytes.Count(output.Bytes(), []byte("\n")))

	register := <-server.requests
	require.Equal(t, event.EventRegisterDataListener, register.Event)
	require.Equal(t, []types.ModuleName{types.ModuleCPU, types.ModuleMemory}, register.Data.Modules)
	require.Equal(t, testToken, register.Token)
}

func TestWatchReturnsServerError(t *testing.T) {
	tests := []struct {
		name       string
		writeError func(*testing.T, *websocket.Conn, websocketRequest)
		want       string
	}{
		{
			name: "registration error",
			writeError: func(t *testing.T, conn *websocket.Conn, register websocketRequest) {
				require.NoError(t, conn.WriteJSON(event.MessageResponse{
					ID:      register.ID,
					Type:    event.ResponseTypeError,
					Subtype: event.ResponseSubtypeBadToken,
					Message: "Invalid token",
				}))
			},
			want: "server error \"BAD_TOKEN\": Invalid token",
		},
		{
			name: "stream error",
			writeError: func(t *testing.T, conn *websocket.Conn, register websocketRequest) {
				acknowledgeRegistration(t, conn, register)
				var getData websocketRequest
				require.NoError(t, conn.ReadJSON(&getData))
				require.NoError(t, conn.WriteJSON(event.MessageResponse{
					ID:      getData.ID,
					Type:    event.ResponseTypeError,
					Subtype: event.ResponseSubtypeBadRequest,
					Message: "Bad modules",
				}))
			},
			want: "server error \"BAD_REQUEST\": Bad modules",
		},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			server := newWatchServer(t, func(conn *websocket.Conn, register websocketRequest) {
				test.writeError(t, conn, register)
			})

			err := Watch(context.Background(), watchOptions(server, io.Discard, types.ModuleCPU))
			require.EqualError(t, err, test.want)
		})
	}
}

func TestWatchRejectsMalformedMessages(t *testing.T) {
	tests := []struct {
		name    string
		message string
	}{
		{name: "invalid JSON", message: "not-json"},
		{name: "missing required fields", message: `{}`},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			server := newWatchServer(t, func(conn *websocket.Conn, _ websocketRequest) {
				require.NoError(t, conn.WriteMessage(websocket.TextMessage, []byte(test.message)))
			})

			err := Watch(context.Background(), watchOptions(server, io.Discard, types.ModuleCPU))
			require.ErrorContains(t, err, "await data listener acknowledgement")
		})
	}
}

func TestWatchRejectsMalformedStreamMessage(t *testing.T) {
	server := newWatchServer(t, func(conn *websocket.Conn, register websocketRequest) {
		acknowledgeRegistration(t, conn, register)
		var getData websocketRequest
		require.NoError(t, conn.ReadJSON(&getData))
		require.NoError(t, conn.WriteMessage(websocket.TextMessage, []byte("not-json")))
	})

	err := Watch(context.Background(), watchOptions(server, io.Discard, types.ModuleCPU))
	require.ErrorContains(t, err, "read data websocket")
}

func TestWatchRejectsInvalidModulesBeforeLoadingToken(t *testing.T) {
	tokenLoaded := false
	err := Watch(context.Background(), WatchOptions{
		Modules: []types.ModuleName{"unknown"},
		Writer:  io.Discard,
		loadToken: func() (string, error) {
			tokenLoaded = true
			return testToken, nil
		},
	})

	require.EqualError(t, err, `unknown module "unknown"`)
	require.False(t, tokenLoaded)
}

func TestWatchCancellationSendsNormalCloseAndUnblocksRead(t *testing.T) {
	closeCode := make(chan int, 1)
	ready := make(chan struct{})
	server := newWatchServer(t, func(conn *websocket.Conn, register websocketRequest) {
		acknowledgeRegistration(t, conn, register)

		var getData websocketRequest
		require.NoError(t, conn.ReadJSON(&getData))
		close(ready)
		_, _, err := conn.ReadMessage()
		var closeErr *websocket.CloseError
		if errors.As(err, &closeErr) {
			closeCode <- closeErr.Code
			return
		}
		closeCode <- 0
	})

	ctx, cancel := context.WithCancel(context.Background())
	done := make(chan error, 1)
	go func() {
		done <- Watch(ctx, watchOptions(server, io.Discard, types.ModuleCPU))
	}()

	select {
	case <-ready:
	case <-time.After(time.Second):
		t.Fatal("watch did not request initial data")
	}
	cancel()

	select {
	case err := <-done:
		require.ErrorIs(t, err, context.Canceled)
	case <-time.After(time.Second):
		t.Fatal("watch did not return promptly after cancellation")
	}
	require.Equal(t, websocket.CloseNormalClosure, <-closeCode)
}

func TestWatchReturnsOutputError(t *testing.T) {
	wantErr := errors.New("output failed")
	server := newWatchServer(t, func(conn *websocket.Conn, register websocketRequest) {
		acknowledgeRegistration(t, conn, register)
		var getData websocketRequest
		require.NoError(t, conn.ReadJSON(&getData))
		require.NoError(t, conn.WriteJSON(event.MessageResponse{
			ID:      "system",
			Type:    event.ResponseTypeDataUpdate,
			Subtype: event.ResponseSubtypeNone,
			Module:  types.ModuleCPU,
			Data:    map[string]any{"usage": 12.5},
		}))
	})

	err := Watch(context.Background(), watchOptions(server, errorWriter{err: wantErr}, types.ModuleCPU))
	require.ErrorIs(t, err, wantErr)
	require.ErrorContains(t, err, "write data update")
}

type errorWriter struct {
	err error
}

func (w errorWriter) Write(_ []byte) (int, error) {
	return 0, w.err
}
