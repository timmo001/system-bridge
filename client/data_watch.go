package client

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"time"

	"github.com/google/uuid"
	"github.com/gorilla/websocket"
	"github.com/timmo001/system-bridge/event"
	"github.com/timmo001/system-bridge/types"
	"github.com/timmo001/system-bridge/utils"
)

const closeTimeout = time.Second

var knownModules = map[types.ModuleName]struct{}{
	types.ModuleBattery:   {},
	types.ModuleCPU:       {},
	types.ModuleDisks:     {},
	types.ModuleDisplays:  {},
	types.ModuleGPUs:      {},
	types.ModuleMedia:     {},
	types.ModuleMemory:    {},
	types.ModuleNetworks:  {},
	types.ModuleProcesses: {},
	types.ModuleSensors:   {},
	types.ModuleSystem:    {},
}

// WatchOptions configures a data module watch.
type WatchOptions struct {
	Modules []types.ModuleName
	Writer  io.Writer

	url       string
	loadToken func() (string, error)
	dialer    *websocket.Dialer
}

type websocketRequest struct {
	ID    string               `json:"id"`
	Event event.EventType      `json:"event"`
	Data  websocketRequestData `json:"data"`
	Token string               `json:"token"`
}

type websocketRequestData struct {
	Modules []types.ModuleName `json:"modules"`
}

// Watch streams data updates for the requested modules as newline-delimited JSON.
func Watch(ctx context.Context, options WatchOptions) error {
	if len(options.Modules) == 0 {
		return fmt.Errorf("at least one module is required")
	}
	if options.Writer == nil {
		return fmt.Errorf("writer is required")
	}
	requestedModules := make(map[types.ModuleName]struct{}, len(options.Modules))
	for _, module := range options.Modules {
		if _, ok := knownModules[module]; !ok {
			return fmt.Errorf("unknown module %q", module)
		}
		requestedModules[module] = struct{}{}
	}
	if err := ctx.Err(); err != nil {
		return err
	}

	loadToken := options.loadToken
	if loadToken == nil {
		loadToken = utils.LoadToken
	}
	token, err := loadToken()
	if err != nil {
		return fmt.Errorf("error loading token: %w", err)
	}

	url := options.url
	if url == "" {
		url = fmt.Sprintf("ws://127.0.0.1:%d/api/websocket", utils.GetPort())
	}
	dialer := options.dialer
	if dialer == nil {
		dialer = websocket.DefaultDialer
	}
	conn, response, err := dialer.DialContext(ctx, url, nil)
	if err != nil {
		if response != nil && response.Body != nil {
			if closeErr := response.Body.Close(); closeErr != nil {
				return fmt.Errorf("connect to data websocket: %w (close response body: %v)", err, closeErr)
			}
		}
		return fmt.Errorf("connect to data websocket: %w", err)
	}
	defer func() { _ = conn.Close() }()

	stopCancellation := context.AfterFunc(ctx, func() {
		deadline := time.Now().Add(closeTimeout)
		_ = conn.WriteControl(
			websocket.CloseMessage,
			websocket.FormatCloseMessage(websocket.CloseNormalClosure, ""),
			deadline,
		)
		_ = conn.Close()
	})
	defer stopCancellation()

	registerID := uuid.NewString()
	if err := conn.WriteJSON(websocketRequest{
		ID:    registerID,
		Event: event.EventRegisterDataListener,
		Data:  websocketRequestData{Modules: options.Modules},
		Token: token,
	}); err != nil {
		return watchError(ctx, "register data listener", err)
	}

	responseMessage, err := readResponse(conn)
	if err != nil {
		return watchError(ctx, "await data listener acknowledgement", err)
	}
	if responseMessage.Type == event.ResponseTypeError {
		return serverError(responseMessage)
	}
	if responseMessage.ID != registerID || responseMessage.Type != event.ResponseTypeDataListenerRegistered {
		return fmt.Errorf("unexpected data listener acknowledgement: id %q, type %q", responseMessage.ID, responseMessage.Type)
	}

	if err := conn.WriteJSON(websocketRequest{
		ID:    uuid.NewString(),
		Event: event.EventGetData,
		Data:  websocketRequestData{Modules: options.Modules},
		Token: token,
	}); err != nil {
		return watchError(ctx, "request initial data", err)
	}

	encoder := json.NewEncoder(options.Writer)
	for {
		responseMessage, err := readResponse(conn)
		if err != nil {
			return watchError(ctx, "read data websocket", err)
		}
		if responseMessage.Type == event.ResponseTypeError {
			return serverError(responseMessage)
		}
		if responseMessage.Type != event.ResponseTypeDataUpdate {
			continue
		}
		if _, ok := requestedModules[responseMessage.Module]; !ok {
			continue
		}
		if err := encoder.Encode(responseMessage); err != nil {
			return fmt.Errorf("write data update: %w", err)
		}
	}
}

func readResponse(conn *websocket.Conn) (event.MessageResponse, error) {
	var response event.MessageResponse
	if err := conn.ReadJSON(&response); err != nil {
		return event.MessageResponse{}, err
	}
	if response.ID == "" || response.Type == "" {
		return event.MessageResponse{}, fmt.Errorf("malformed websocket response: id and type are required")
	}
	return response, nil
}

func watchError(ctx context.Context, action string, err error) error {
	if ctxErr := ctx.Err(); ctxErr != nil {
		return ctxErr
	}
	return fmt.Errorf("%s: %w", action, err)
}

func serverError(response event.MessageResponse) error {
	return fmt.Errorf("server error %q: %s", response.Subtype, response.Message)
}
