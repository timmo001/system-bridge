package mcp

import (
	"net/http"

	sdkmcp "github.com/modelcontextprotocol/go-sdk/mcp"
	"github.com/timmo001/system-bridge/data"
	"github.com/timmo001/system-bridge/event"
	"github.com/timmo001/system-bridge/version"
)

// MCPServer serves MCP over Streamable HTTP and WebSocket transports.
type MCPServer struct {
	token                 string
	server                *sdkmcp.Server
	streamableHTTPHandler http.Handler
}

// NewMCPServer creates a new MCP HTTP handler.
func NewMCPServer(token string, eventRouter *event.MessageRouter, dataStore *data.DataStore) *MCPServer {
	server := sdkmcp.NewServer(
		&sdkmcp.Implementation{Name: "system-bridge", Version: version.Version},
		&sdkmcp.ServerOptions{
			Instructions: "System Bridge MCP server. Documentation: " + version.DocsMCPURL,
			Capabilities: &sdkmcp.ServerCapabilities{
				Tools: &sdkmcp.ToolCapabilities{},
			},
		},
	)
	registerTools(server, eventRouter, dataStore)

	s := &MCPServer{token: token, server: server}
	s.streamableHTTPHandler = sdkmcp.NewStreamableHTTPHandler(
		func(*http.Request) *sdkmcp.Server { return server },
		&sdkmcp.StreamableHTTPOptions{Stateless: true, JSONResponse: true},
	)
	return s
}

// ServeHTTP authenticates and dispatches MCP requests by transport.
func (s *MCPServer) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	if !s.authenticated(r) {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	if isWebSocketUpgrade(r) {
		s.serveWebSocket(w, r)
		return
	}

	s.streamableHTTPHandler.ServeHTTP(w, r)
}
