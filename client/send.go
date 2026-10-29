package client

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/gorilla/websocket"
	"github.com/timmo001/system-bridge/event"
	"github.com/timmo001/system-bridge/utils"
)

const sendTimeout = 10 * time.Second

// SlowSendTimeout is for events the backend can take up to 30 seconds on,
// such as waking a monitor over DDC/CI
const SlowSendTimeout = 35 * time.Second

type eventRequest struct {
	ID    string          `json:"id"`
	Event event.EventType `json:"event"`
	Data  any             `json:"data"`
	Token string          `json:"token"`
}

// Send sends one event to the local backend and waits for its answer.
func Send(ctx context.Context, eventType event.EventType, data any) error {
	return SendWithin(ctx, sendTimeout, eventType, data)
}

// SendWithin is Send, waiting up to timeout for the answer.
func SendWithin(ctx context.Context, timeout time.Duration, eventType event.EventType, data any) error {
	_, err := request(ctx, timeout, eventType, data)
	return err
}

// Request sends one event to the local backend and returns the data of its
// answer as JSON
func Request(ctx context.Context, eventType event.EventType, data any) (json.RawMessage, error) {
	return request(ctx, sendTimeout, eventType, data)
}

// request sends one event to the local backend and returns the data of its
// answer, undecoded.
func request(ctx context.Context, timeout time.Duration, eventType event.EventType, data any) (json.RawMessage, error) {
	return requestReply(ctx, timeout, eventType, data, "")
}

// requestReply is request, waiting for a reply of the given type when it's
// set, for events such as COMMAND_EXECUTE that answer more than once
func requestReply(ctx context.Context, timeout time.Duration, eventType event.EventType, data any, reply event.ResponseType) (json.RawMessage, error) {
	token, err := utils.LoadToken()
	if err != nil {
		return nil, fmt.Errorf("load token: %w", err)
	}
	ctx, cancel := context.WithTimeout(ctx, timeout)
	defer cancel()

	url := fmt.Sprintf("ws://127.0.0.1:%d/api/websocket", utils.GetPort())
	conn, response, err := websocket.DefaultDialer.DialContext(ctx, url, nil)
	if err != nil {
		if response != nil && response.Body != nil {
			_ = response.Body.Close()
		}
		return nil, fmt.Errorf("connect to websocket: %w", err)
	}
	defer func() { _ = conn.Close() }()
	stopCancellation := context.AfterFunc(ctx, func() { _ = conn.Close() })
	defer stopCancellation()

	id := uuid.NewString()
	if err := conn.WriteJSON(eventRequest{ID: id, Event: eventType, Data: data, Token: token}); err != nil {
		return nil, watchError(ctx, "send event", err)
	}
	for {
		responseMessage, err := readResponse(conn)
		if err != nil {
			return nil, watchError(ctx, "await event response", err)
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
