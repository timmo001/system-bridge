package mcp

import (
	"context"
	"encoding/json"
	"net/http"
	"net/url"

	"log/slog"

	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		// Allow all origins for MCP connections
		// Token authentication provides security
		return true
	},
}

// HandleConnection handles a new MCP WebSocket connection
func (s *MCPServer) HandleConnection(w http.ResponseWriter, r *http.Request) error {
	// Check for token in query parameters or headers
	token := r.URL.Query().Get("token")
	if token == "" {
		token = r.Header.Get("Authorization")
		// Remove "Bearer " prefix if present
		if len(token) > 7 && token[:7] == "Bearer " {
			token = token[7:]
		}
	}

	// Validate token
	if token != s.token {
		slog.Warn("MCP connection rejected: invalid token")
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return nil
	}

	// Upgrade connection to WebSocket
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		slog.Error("Failed to upgrade MCP connection", "error", err)
		return err
	}

	slog.Info("MCP client connected", "remote", conn.RemoteAddr().String())

	// Handle messages in a goroutine
	go s.handleMessages(conn)

	return nil
}

// handleMessages handles incoming messages from a WebSocket connection
func (s *MCPServer) handleMessages(conn *websocket.Conn) {
	defer func() {
		if err := conn.Close(); err != nil {
			slog.Error("Error closing MCP connection", "error", err)
		}
		slog.Info("MCP client disconnected", "remote", conn.RemoteAddr().String())
	}()

	for {
		// Read message
		_, message, err := conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				slog.Error("MCP WebSocket error", "error", err)
			}
			break
		}

		// Log raw message for debugging
		slog.Debug("MCP raw message received", "message", string(message))

		// Parse request
		var req MCPRequest
		if err := json.Unmarshal(message, &req); err != nil {
			slog.Error("Failed to parse MCP request", "error", err, "raw_message", string(message))
			response := NewErrorResponse(nil, ErrorCodeParseError, "Parse error", nil)
			s.sendResponse(conn, response)
			continue
		}

		slog.Debug("MCP request parsed", "method", req.Method, "id", req.ID)

		// Check if this is a notification (no ID means no response expected)
		if req.ID == nil {
			slog.Debug("Received notification (no response needed)", "method", req.Method)
			// For notifications, just log and continue without responding
			continue
		}

		// Handle request
		ctx := context.Background()
		response := s.HandleRequest(ctx, req)

		// Send response
		s.sendResponse(conn, response)
	}
}

// sendResponse sends a response to the WebSocket client
func (s *MCPServer) sendResponse(conn *websocket.Conn, response MCPResponse) {
	if err := conn.WriteJSON(response); err != nil {
		slog.Error("Failed to send MCP response", "error", err)
	}
}

// GetTokenFromURL extracts token from URL query parameters
func GetTokenFromURL(u *url.URL) string {
	return u.Query().Get("token")
}
