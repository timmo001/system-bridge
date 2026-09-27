package mcp

import (
	"context"
	"fmt"
	"net/http"
	"strings"
	"sync"

	"log/slog"

	"github.com/gorilla/websocket"
	"github.com/modelcontextprotocol/go-sdk/jsonrpc"
	sdkmcp "github.com/modelcontextprotocol/go-sdk/mcp"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		// Allow all origins for MCP connections
		// Token authentication provides security
		return true
	},
}

func (s *MCPServer) authenticated(r *http.Request) bool {
	token := r.URL.Query().Get("token")
	if token == "" {
		token = strings.TrimPrefix(r.Header.Get("Authorization"), "Bearer ")
	}
	return token != "" && token == s.token
}

func isWebSocketUpgrade(r *http.Request) bool {
	return websocket.IsWebSocketUpgrade(r)
}

func (s *MCPServer) serveWebSocket(w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		slog.Error("Failed to upgrade MCP connection", "error", err)
		return
	}

	remote := conn.RemoteAddr().String()
	slog.Info("MCP client connected", "remote", remote)

	session, err := s.server.Connect(r.Context(), &webSocketTransport{conn: conn}, nil)
	if err != nil {
		slog.Error("Failed to connect MCP WebSocket transport", "error", err)
		if closeErr := conn.Close(); closeErr != nil {
			slog.Error("Error closing MCP connection", "error", closeErr)
		}
		return
	}
	if err := session.Wait(); err != nil && !websocket.IsCloseError(err, websocket.CloseNormalClosure, websocket.CloseGoingAway) {
		slog.Debug("MCP WebSocket session ended", "error", err)
	}
	slog.Info("MCP client disconnected", "remote", remote)
}

type webSocketTransport struct {
	conn *websocket.Conn
}

func (t *webSocketTransport) Connect(context.Context) (sdkmcp.Connection, error) {
	if t.conn == nil {
		return nil, fmt.Errorf("WebSocket connection is nil")
	}
	return &webSocketConnection{conn: t.conn}, nil
}

type webSocketConnection struct {
	conn      *websocket.Conn
	writeMu   sync.Mutex
	closeOnce sync.Once
	closeErr  error
}

func (c *webSocketConnection) Read(context.Context) (jsonrpc.Message, error) {
	_, data, err := c.conn.ReadMessage()
	if err != nil {
		return nil, err
	}
	message, err := jsonrpc.DecodeMessage(data)
	if err != nil {
		return nil, fmt.Errorf("decode WebSocket MCP message: %v", err)
	}
	return message, nil
}

func (c *webSocketConnection) Write(_ context.Context, message jsonrpc.Message) error {
	data, err := jsonrpc.EncodeMessage(message)
	if err != nil {
		return fmt.Errorf("encode WebSocket MCP message: %v", err)
	}

	c.writeMu.Lock()
	defer c.writeMu.Unlock()
	if err := c.conn.WriteMessage(websocket.TextMessage, data); err != nil {
		return fmt.Errorf("write WebSocket MCP message: %v", err)
	}
	return nil
}

func (c *webSocketConnection) Close() error {
	c.closeOnce.Do(func() { c.closeErr = c.conn.Close() })
	return c.closeErr
}

func (*webSocketConnection) SessionID() string { return "" }
