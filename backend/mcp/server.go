package mcp

import (
	"context"
	"encoding/json"

	"log/slog"

	"github.com/timmo001/system-bridge/data"
	"github.com/timmo001/system-bridge/event"
	"github.com/timmo001/system-bridge/version"
)

// MCPServer handles MCP protocol requests
type MCPServer struct {
	token       string
	eventRouter *event.MessageRouter
	dataStore   *data.DataStore
}

// NewMCPServer creates a new MCP server
func NewMCPServer(token string, eventRouter *event.MessageRouter, dataStore *data.DataStore) *MCPServer {
	return &MCPServer{
		token:       token,
		eventRouter: eventRouter,
		dataStore:   dataStore,
	}
}

// HandleRequest processes an MCP JSON-RPC request
func (s *MCPServer) HandleRequest(ctx context.Context, req MCPRequest) MCPResponse {
	slog.Info("MCP request received", "method", req.Method, "id", req.ID)

	switch req.Method {
	case "initialize":
		return s.handleInitialize(req)
	case "tools/list":
		return s.handleToolsList(req)
	case "tools/call":
		return s.handleToolCall(ctx, req)
	default:
		return NewErrorResponse(req.ID, ErrorCodeMethodNotFound, "Method not found", nil)
	}
}

// handleInitialize handles the initialize request
func (s *MCPServer) handleInitialize(req MCPRequest) MCPResponse {
	var params InitializeParams
	if req.Params != nil {
		// Try to decode params
		paramsJSON, err := json.Marshal(req.Params)
		if err == nil {
			_ = json.Unmarshal(paramsJSON, &params)
		}
	}

	slog.Info("MCP client initializing", "client", params.ClientInfo.Name, "version", params.ClientInfo.Version)

	result := InitializeResult{
		ProtocolVersion: "2024-11-05",
		Capabilities: ServerCapabilities{
			Tools: map[string]interface{}{},
		},
		ServerInfo: ServerInfo{
			Name:    "system-bridge",
			Version: version.Version,
		},
	}

	return NewSuccessResponse(req.ID, result)
}

// handleToolsList handles the tools/list request
func (s *MCPServer) handleToolsList(req MCPRequest) MCPResponse {
	result := ToolsListResult{
		Tools: GetToolDefinitions(),
	}

	return NewSuccessResponse(req.ID, result)
}

// handleToolCall handles the tools/call request
func (s *MCPServer) handleToolCall(ctx context.Context, req MCPRequest) MCPResponse {
	var params ToolCallParams

	// Convert params to ToolCallParams
	paramsJSON, err := json.Marshal(req.Params)
	if err != nil {
		return NewErrorResponse(req.ID, ErrorCodeInvalidParams, "Invalid parameters", nil)
	}

	if err := json.Unmarshal(paramsJSON, &params); err != nil {
		return NewErrorResponse(req.ID, ErrorCodeInvalidParams, "Invalid parameters", nil)
	}

	// Validate tool name
	if params.Name == "" {
		return NewErrorResponse(req.ID, ErrorCodeInvalidParams, "Missing tool name", nil)
	}

	// Execute the tool
	result, err := s.ExecuteTool(ctx, params.Name, params.Arguments)
	if err != nil {
		slog.Error("Tool execution failed", "tool", params.Name, "error", err)
		return NewErrorResponse(req.ID, ErrorCodeInternalError, err.Error(), nil)
	}

	// Format result as MCP ToolCallResult
	toolResult := formatToolResult(result)

	return NewSuccessResponse(req.ID, toolResult)
}
