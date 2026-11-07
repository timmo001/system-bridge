package mcp

import (
	"context"
	"fmt"

	sdkmcp "github.com/modelcontextprotocol/go-sdk/mcp"
	"github.com/timmo001/system-bridge/version"
)

// ListTools returns every tool the server registers, without a running
// backend: the handlers are never called, so they need no router or data
// store. The agent command reads its manifest from this.
func ListTools(ctx context.Context) ([]*sdkmcp.Tool, error) {
	server := sdkmcp.NewServer(&sdkmcp.Implementation{Name: "system-bridge", Version: version.Version}, nil)
	registerTools(server, nil, nil)

	serverTransport, clientTransport := sdkmcp.NewInMemoryTransports()
	serverSession, err := server.Connect(ctx, serverTransport, nil)
	if err != nil {
		return nil, fmt.Errorf("start the tool catalogue: %v", err)
	}
	defer func() { _ = serverSession.Close() }()

	client := sdkmcp.NewClient(&sdkmcp.Implementation{Name: "system-bridge-agent", Version: version.Version}, nil)
	session, err := client.Connect(ctx, clientTransport, nil)
	if err != nil {
		return nil, fmt.Errorf("read the tool catalogue: %v", err)
	}
	defer func() { _ = session.Close() }()

	tools := []*sdkmcp.Tool{}
	for tool, err := range session.Tools(ctx, nil) {
		if err != nil {
			return nil, fmt.Errorf("list tools: %v", err)
		}
		tools = append(tools, tool)
	}
	return tools, nil
}
