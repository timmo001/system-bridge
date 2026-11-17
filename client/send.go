package client

import (
	"context"
	"encoding/json"
	"time"

	"github.com/google/uuid"
	"github.com/gorilla/websocket"
	"github.com/timmo001/system-bridge/event"
)

const sendTimeout = 10 * time.Second

// SlowSendTimeout is for events the backend can take up to 30 seconds on,
// such as waking a monitor over DDC/CI
const SlowSendTimeout = 35 * time.Second

type eventRequest struct {
	ID    string          `json:"id"`
	Event event.EventType `json:"event"`
	Data  any             `json:"data"`
}

// socketAuth is a WebSocket's first message, which signs it in with a key
type socketAuth struct {
	Type string `json:"type"`
	Key  string `json:"key"`
}

// signIn signs a WebSocket connection in with a key. A wrong key is
// answered with BAD_KEY and the connection closed.
func signIn(conn *websocket.Conn, key string) error {
	return conn.WriteJSON(socketAuth{Type: "auth", Key: key})
}

// Send sends one event to the backend and waits for its answer.
func Send(ctx context.Context, eventType event.EventType, data any) error {
	return SendWithin(ctx, sendTimeout, eventType, data)
}

// SendWithin is Send, waiting up to timeout for the answer.
func SendWithin(ctx context.Context, timeout time.Duration, eventType event.EventType, data any) error {
	_, err := request(ctx, timeout, eventType, data)
	return err
}

// Request sends one event to the backend and returns the data of its
// answer as JSON
func Request(ctx context.Context, eventType event.EventType, data any) (json.RawMessage, error) {
	return request(ctx, sendTimeout, eventType, data)
}

// RequestWithin is Request, waiting up to timeout for the answer.
func RequestWithin(ctx context.Context, timeout time.Duration, eventType event.EventType, data any) (json.RawMessage, error) {
	return request(ctx, timeout, eventType, data)
}

// request sends one event to the backend and returns the data of its
// answer, undecoded.
func request(ctx context.Context, timeout time.Duration, eventType event.EventType, data any) (json.RawMessage, error) {
	return requestReply(ctx, timeout, eventType, data, "")
}

// requestReply is request, waiting for a reply of the given type when it's
// set, for events such as COMMAND_EXECUTE that answer more than once
func requestReply(ctx context.Context, timeout time.Duration, eventType event.EventType, data any, reply event.ResponseType) (json.RawMessage, error) {
	backend, err := BackendFor(ctx)
	if err != nil {
		return nil, err
	}
	ctx, cancel := context.WithTimeout(ctx, timeout)
	defer cancel()

	conn, response, err := websocket.DefaultDialer.DialContext(ctx, backend.WebSocket(), nil)
	if err != nil {
		if response != nil && response.Body != nil {
			_ = response.Body.Close()
		}
		return nil, backend.Unreachable(err)
	}
	defer func() { _ = conn.Close() }()
	stopCancellation := context.AfterFunc(ctx, func() { _ = conn.Close() })
	defer stopCancellation()

	if err := signIn(conn, backend.Key); err != nil {
		return nil, watchError(ctx, "sign in", err)
	}
	id := uuid.NewString()
	if err := conn.WriteJSON(eventRequest{ID: id, Event: eventType, Data: data}); err != nil {
		return nil, watchError(ctx, "send event", err)
	}
	for {
		responseMessage, err := readResponse(conn)
		if err != nil {
			return nil, backend.Rejected(watchError(ctx, "await event response", err))
		}
		if responseMessage.ID != id {
			continue
		}
		if responseMessage.Type == event.ResponseTypeError {
			return nil, serverError(responseMessage)
		}
		if reply != "" && responseMessage.Type != reply {
			continue
		}
		// readResponse keeps the data as raw JSON
		if raw, ok := responseMessage.Data.(*json.RawMessage); ok && raw != nil {
			return *raw, nil
		}
		return nil, nil
	}
}
