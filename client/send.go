package client

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/gorilla/websocket"
	"github.com/timmo001/system-bridge/event"
	"github.com/timmo001/system-bridge/utils"
)

const sendTimeout = 10 * time.Second

type eventRequest struct {
	ID    string          `json:"id"`
	Event event.EventType `json:"event"`
	Data  any             `json:"data"`
	Token string          `json:"token"`
}

// Send sends one event to the local backend and waits for its answer.
func Send(ctx context.Context, eventType event.EventType, data any) error {
	token, err := utils.LoadToken()
	if err != nil {
		return fmt.Errorf("load token: %w", err)
	}
	ctx, cancel := context.WithTimeout(ctx, sendTimeout)
	defer cancel()

	url := fmt.Sprintf("ws://127.0.0.1:%d/api/websocket", utils.GetPort())
	conn, response, err := websocket.DefaultDialer.DialContext(ctx, url, nil)
	if err != nil {
		if response != nil && response.Body != nil {
			_ = response.Body.Close()
		}
		return fmt.Errorf("connect to websocket: %w", err)
	}
	defer func() { _ = conn.Close() }()
	stopCancellation := context.AfterFunc(ctx, func() { _ = conn.Close() })
	defer stopCancellation()

	id := uuid.NewString()
	if err := conn.WriteJSON(eventRequest{ID: id, Event: eventType, Data: data, Token: token}); err != nil {
		return watchError(ctx, "send event", err)
	}
	for {
		responseMessage, err := readResponse(conn)
		if err != nil {
			return watchError(ctx, "await event response", err)
		}
		if responseMessage.ID != id {
			continue
		}
		if responseMessage.Type == event.ResponseTypeError {
			return serverError(responseMessage)
		}
		return nil
	}
}
