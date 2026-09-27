package mcp

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/gorilla/websocket"
	sdkmcp "github.com/modelcontextprotocol/go-sdk/mcp"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/timmo001/system-bridge/data"
	"github.com/timmo001/system-bridge/event"
)

const testToken = "test-token"

func TestHTTPAuthentication(t *testing.T) {
	handler := newTestServer(t)

	tests := []struct {
		name          string
		queryToken    string
		authorization string
		wantStatus    int
	}{
		{name: "missing token", wantStatus: http.StatusUnauthorized},
		{name: "invalid query token", queryToken: "invalid", wantStatus: http.StatusUnauthorized},
		{name: "invalid bearer token", authorization: "Bearer invalid", wantStatus: http.StatusUnauthorized},
		{name: "query token", queryToken: testToken, wantStatus: http.StatusOK},
		{name: "bearer token", authorization: "Bearer " + testToken, wantStatus: http.StatusOK},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			request := httptest.NewRequest(http.MethodPost, "/api/mcp?token="+tt.queryToken, strings.NewReader(
				`{"jsonrpc":"2.0","id":1,"method":"initialize","params":{}}`,
			))
			request.Header.Set("Content-Type", "application/json")
			request.Header.Set("Accept", "application/json, text/event-stream")
			if tt.authorization != "" {
				request.Header.Set("Authorization", tt.authorization)
			}

			response := httptest.NewRecorder()
			handler.ServeHTTP(response, request)

			assert.Equal(t, tt.wantStatus, response.Code)
		})
	}
}

func TestLegacyStreamableHTTPInitialization(t *testing.T) {
	handler := newTestServer(t)
	response := serveMCPRequest(t, handler, `{
		"jsonrpc":"2.0",
		"id":1,
		"method":"initialize",
		"params":{
			"protocolVersion":"2025-11-25",
			"capabilities":{},
			"clientInfo":{"name":"home-assistant","version":"2026.8.0"}
		}
	}`)
	require.Equal(t, http.StatusOK, response.Code)

	var initializeResponse struct {
		JSONRPC string `json:"jsonrpc"`
		ID      int    `json:"id"`
		Result  struct {
			ProtocolVersion string `json:"protocolVersion"`
			ServerInfo      struct {
				Name string `json:"name"`
			} `json:"serverInfo"`
			Capabilities struct {
				Tools *struct{} `json:"tools"`
			} `json:"capabilities"`
		} `json:"result"`
	}
	require.NoError(t, json.Unmarshal(response.Body.Bytes(), &initializeResponse))
	assert.Equal(t, "2.0", initializeResponse.JSONRPC)
	assert.Equal(t, 1, initializeResponse.ID)
	assert.Equal(t, "2025-11-25", initializeResponse.Result.ProtocolVersion)
	assert.Equal(t, "system-bridge", initializeResponse.Result.ServerInfo.Name)
	assert.NotNil(t, initializeResponse.Result.Capabilities.Tools)

	initializedResponse := serveMCPRequest(t, handler, `{
		"jsonrpc":"2.0",
		"method":"notifications/initialized"
	}`)
	assert.Equal(t, http.StatusAccepted, initializedResponse.Code)
}

func TestStreamableHTTPWithSDKClient(t *testing.T) {
	httpServer := httptest.NewServer(newTestServer(t))
	t.Cleanup(httpServer.Close)

	client := sdkmcp.NewClient(&sdkmcp.Implementation{Name: "test-client", Version: "1.0.0"}, nil)
	ctx, cancel := context.WithTimeout(t.Context(), 5*time.Second)
	defer cancel()
	session, err := client.Connect(ctx, &sdkmcp.StreamableClientTransport{
		Endpoint: httpServer.URL + "?token=" + testToken,
	}, nil)
	require.NoError(t, err)
	t.Cleanup(func() { require.NoError(t, session.Close()) })

	assertToolsAndGetData(t, ctx, session)
}

func TestWebSocketAuthentication(t *testing.T) {
	httpServer := httptest.NewServer(newTestServer(t))
	t.Cleanup(httpServer.Close)
	url := "ws" + strings.TrimPrefix(httpServer.URL, "http")

	for _, tt := range []struct {
		name          string
		query         string
		authorization string
		wantStatus    int
	}{
		{name: "missing token", wantStatus: http.StatusUnauthorized},
		{name: "invalid token", query: "?token=invalid", wantStatus: http.StatusUnauthorized},
		{name: "bearer token", authorization: "Bearer " + testToken, wantStatus: http.StatusSwitchingProtocols},
	} {
		t.Run(tt.name, func(t *testing.T) {
			header := http.Header{}
			if tt.authorization != "" {
				header.Set("Authorization", tt.authorization)
			}
			ctx, cancel := context.WithTimeout(t.Context(), 5*time.Second)
			defer cancel()
			conn, response, err := websocket.DefaultDialer.DialContext(ctx, url+tt.query, header)
			require.NotNil(t, response)
			assert.Equal(t, tt.wantStatus, response.StatusCode)
			require.NoError(t, response.Body.Close())
			if tt.wantStatus == http.StatusSwitchingProtocols {
				require.NoError(t, err)
				require.NoError(t, conn.Close())
			} else {
				assert.Error(t, err)
				assert.Nil(t, conn)
			}
		})
	}
}

func TestWebSocketWithSDKClient(t *testing.T) {
	httpServer := httptest.NewServer(newTestServer(t))
	t.Cleanup(httpServer.Close)

	url := "ws" + strings.TrimPrefix(httpServer.URL, "http") + "?token=" + testToken
	ctx, cancel := context.WithTimeout(t.Context(), 5*time.Second)
	defer cancel()
	conn, response, err := websocket.DefaultDialer.DialContext(ctx, url, nil)
	if response != nil {
		t.Cleanup(func() { require.NoError(t, response.Body.Close()) })
	}
	require.NoError(t, err)

	client := sdkmcp.NewClient(&sdkmcp.Implementation{Name: "test-client", Version: "1.0.0"}, nil)
	session, err := client.Connect(ctx, &webSocketTransport{conn: conn}, nil)
	require.NoError(t, err)
	t.Cleanup(func() { require.NoError(t, session.Close()) })

	assertToolsAndGetData(t, ctx, session)
}

func assertToolsAndGetData(t *testing.T, ctx context.Context, session *sdkmcp.ClientSession) {
	t.Helper()

	tools, err := session.ListTools(ctx, nil)
	require.NoError(t, err)
	require.Len(t, tools.Tools, 3)
	names := make([]string, 0, len(tools.Tools))
	for _, tool := range tools.Tools {
		names = append(names, tool.Name)
	}
	assert.ElementsMatch(t, []string{
		"system_bridge_get_data",
		"system_bridge_send_notification",
		"system_bridge_media_control",
	}, names)
	assertToolSchemas(t, tools.Tools)

	result, err := session.CallTool(ctx, &sdkmcp.CallToolParams{
		Name:      "system_bridge_get_data",
		Arguments: map[string]any{"modules": []string{"cpu", "memory"}},
	})
	require.NoError(t, err)
	require.False(t, result.IsError)
	require.Len(t, result.Content, 1)
	content, ok := result.Content[0].(*sdkmcp.TextContent)
	require.True(t, ok)
	var data map[string]any
	require.NoError(t, json.Unmarshal([]byte(content.Text), &data))
	assert.Contains(t, data, "cpu")
	assert.Contains(t, data, "memory")
}

func assertToolSchemas(t *testing.T, tools []*sdkmcp.Tool) {
	t.Helper()
	byName := make(map[string]*sdkmcp.Tool, len(tools))
	for _, tool := range tools {
		byName[tool.Name] = tool
	}

	getData := schemaMap(t, byName["system_bridge_get_data"])
	assert.Equal(t, []any{"modules"}, getData["required"])
	getDataProperties := getData["properties"].(map[string]any)
	assert.ElementsMatch(t, []string{"modules"}, mapKeys(getDataProperties))
	modules := getDataProperties["modules"].(map[string]any)
	assert.Equal(t, "array", modules["type"])
	moduleItems := modules["items"].(map[string]any)
	assert.Equal(t, "string", moduleItems["type"])
	assert.Equal(t, []any{"battery", "cpu", "disks", "displays", "gpus", "media", "memory", "networks", "processes", "sensors", "system"}, moduleItems["enum"])

	notification := schemaMap(t, byName["system_bridge_send_notification"])
	assert.Equal(t, []any{"title", "message"}, notification["required"])
	notificationProperties := notification["properties"].(map[string]any)
	assert.ElementsMatch(t, []string{"title", "message", "icon"}, mapKeys(notificationProperties))
	for _, name := range []string{"title", "message", "icon"} {
		assert.Equal(t, "string", notificationProperties[name].(map[string]any)["type"])
	}

	media := schemaMap(t, byName["system_bridge_media_control"])
	assert.Equal(t, []any{"action"}, media["required"])
	mediaProperties := media["properties"].(map[string]any)
	assert.ElementsMatch(t, []string{"action"}, mapKeys(mediaProperties))
	action := mediaProperties["action"].(map[string]any)
	assert.Equal(t, "string", action["type"])
	assert.Equal(t, []any{"PLAY", "PAUSE", "STOP", "NEXT", "PREVIOUS", "VOLUME_UP", "VOLUME_DOWN", "MUTE"}, action["enum"])
}

func TestTypedEventHandlers(t *testing.T) {
	router := event.NewMessageRouter()
	handlers := toolHandlers{eventRouter: router}

	tests := []struct {
		name         string
		eventType    event.EventType
		responseType event.ResponseType
		responseText string
		invoke       func() (*sdkmcp.CallToolResult, any, error)
		wantData     map[string]any
	}{
		{
			name:         "notification",
			eventType:    event.EventNotification,
			responseType: event.ResponseTypeNotificationSent,
			responseText: "notification sent",
			invoke: func() (*sdkmcp.CallToolResult, any, error) {
				return handlers.handleNotification(t.Context(), nil, notificationInput{Title: "Title", Message: "Body", Icon: "info"})
			},
			wantData: map[string]any{"title": "Title", "message": "Body", "icon": "info"},
		},
		{
			name:         "media control",
			eventType:    event.EventMediaControl,
			responseType: event.ResponseTypeMediaControlled,
			responseText: "media controlled",
			invoke: func() (*sdkmcp.CallToolResult, any, error) {
				return handlers.handleMediaControl(t.Context(), nil, mediaControlInput{Action: "PLAY"})
			},
			wantData: map[string]any{"action": "PLAY"},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			var received event.Message
			router.RegisterHandler(tt.eventType, func(connection string, message event.Message) event.MessageResponse {
				assert.Equal(t, "mcp", connection)
				received = message
				return event.MessageResponse{Type: tt.responseType, Message: tt.responseText}
			})

			result, output, err := tt.invoke()
			require.NoError(t, err)
			assert.Nil(t, output)
			assert.Equal(t, tt.eventType, received.Event)
			assert.Equal(t, tt.wantData, received.Data)
			require.NotEmpty(t, received.ID)
			content, ok := result.Content[0].(*sdkmcp.TextContent)
			require.True(t, ok)
			var resultData map[string]any
			require.NoError(t, json.Unmarshal([]byte(content.Text), &resultData))
			assert.Equal(t, map[string]any{"success": true, "message": tt.responseText}, resultData)
		})
	}
}

func serveMCPRequest(t *testing.T, handler http.Handler, body string) *httptest.ResponseRecorder {
	t.Helper()
	request := httptest.NewRequest(http.MethodPost, "/api/mcp?token="+testToken, strings.NewReader(body))
	request.Header.Set("Content-Type", "application/json")
	request.Header.Set("Accept", "application/json, text/event-stream")
	response := httptest.NewRecorder()
	handler.ServeHTTP(response, request)
	return response
}

func schemaMap(t *testing.T, tool *sdkmcp.Tool) map[string]any {
	t.Helper()
	require.NotNil(t, tool)
	schema, ok := tool.InputSchema.(map[string]any)
	require.True(t, ok)
	assert.Equal(t, "object", schema["type"])
	return schema
}

func mapKeys(values map[string]any) []string {
	keys := make([]string, 0, len(values))
	for key := range values {
		keys = append(keys, key)
	}
	return keys
}

func newTestServer(t *testing.T) *MCPServer {
	t.Helper()
	dataStore, err := data.NewDataStore()
	require.NoError(t, err)
	return NewMCPServer(testToken, event.NewMessageRouter(), dataStore)
}
