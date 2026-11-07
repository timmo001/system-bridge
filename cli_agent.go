package main

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/google/jsonschema-go/jsonschema"
	sdkmcp "github.com/modelcontextprotocol/go-sdk/mcp"
	"github.com/timmo001/system-bridge/backend/mcp"
	"github.com/timmo001/system-bridge/utils"
	"github.com/timmo001/system-bridge/version"
	"github.com/urfave/cli/v3"
)

// The Code Mode surface. `system-bridge agent tools --json` describes the MCP
// server's tools, and `system-bridge agent call <tool>` runs one through the
// running backend with its input as JSON on stdin, so Code Mode and MCP share
// one implementation and an agent plugin only needs the binary.

const agentToolPrefix = "system_bridge_"

const agentDefaultTimeout = 2 * time.Minute

// agentTimeouts are the tools that can run longer than the default
var agentTimeouts = map[string]time.Duration{
	"run_command":       10 * time.Minute,
	"bluetooth_connect": 2 * time.Minute,
}

// agentResources name the input key whose value narrows a write's
// permission, so "always allow" covers one dispatcher, action or command
var agentResources = map[string]string{
	"discord_control":     "action",
	"hyprland_dispatch":   "dispatcher",
	"hyprland_set_option": "name",
	"media_control":       "action",
	"run_command":         "id",
	"set_power_profile":   "profile",
}

// agentPinned are shown in full in the catalogue
var agentPinned = map[string]bool{"get_data": true}

type agentManifestTool struct {
	Name          string         `json:"name"`
	Argv          []string       `json:"argv"`
	Description   string         `json:"description"`
	Access        string         `json:"access"`
	AlwaysAsk     bool           `json:"alwaysAsk"`
	Pinned        bool           `json:"pinned"`
	TimeoutMillis int64          `json:"timeoutMillis"`
	JSON          bool           `json:"json"`
	Stdin         bool           `json:"stdin"`
	Input         map[string]any `json:"input"`
	Resource      string         `json:"resource,omitempty"`
}

type agentManifest struct {
	// Whether this machine has a backend to call: its token exists
	Available bool                `json:"available"`
	Tools     []agentManifestTool `json:"tools"`
}

func agentTimeout(name string) time.Duration {
	if timeout, ok := agentTimeouts[name]; ok {
		return timeout
	}
	return agentDefaultTimeout
}

// strictInput rejects keys a tool doesn't take, so a misspelt option fails
// rather than being dropped
func strictInput(schema any) (map[string]any, error) {
	encoded, err := json.Marshal(schema)
	if err != nil {
		return nil, fmt.Errorf("encode input schema: %v", err)
	}
	input := map[string]any{}
	if err := json.Unmarshal(encoded, &input); err != nil {
		return nil, fmt.Errorf("decode input schema: %v", err)
	}
	if _, ok := input["additionalProperties"]; !ok {
		input["additionalProperties"] = false
	}
	if properties, ok := input["properties"].(map[string]any); !ok || properties == nil {
		input["properties"] = map[string]any{}
	}
	if required, ok := input["required"].([]any); ok && len(required) == 0 {
		delete(input, "required")
	}
	return input, nil
}

func agentManifestFor(ctx context.Context) (agentManifest, error) {
	tools, err := mcp.ListTools(ctx)
	if err != nil {
		return agentManifest{}, err
	}

	manifest := agentManifest{Tools: make([]agentManifestTool, 0, len(tools))}
	if tokenPath, err := utils.GetTokenFilePath(); err == nil {
		if _, err := os.Stat(tokenPath); err == nil {
			manifest.Available = true
		}
	}

	for _, tool := range tools {
		name := strings.TrimPrefix(tool.Name, agentToolPrefix)
		input, err := strictInput(tool.InputSchema)
		if err != nil {
			return agentManifest{}, fmt.Errorf("%s: %v", name, err)
		}
		access := "write"
		if tool.Annotations != nil && tool.Annotations.ReadOnlyHint {
			access = "read"
		}
		manifest.Tools = append(manifest.Tools, agentManifestTool{
			Name:          name,
			Argv:          []string{"agent", "call", name},
			Description:   strings.ReplaceAll(tool.Description, agentToolPrefix, ""),
			Access:        access,
			Pinned:        agentPinned[name],
			TimeoutMillis: agentTimeout(name).Milliseconds(),
			JSON:          true,
			Stdin:         true,
			Input:         input,
			Resource:      agentResources[name],
		})
	}
	return manifest, nil
}

// bearerTransport adds the API token to every request
type bearerTransport struct {
	token string
	base  http.RoundTripper
}

func (t bearerTransport) RoundTrip(request *http.Request) (*http.Response, error) {
	request = request.Clone(request.Context())
	request.Header.Set("Authorization", "Bearer "+t.token)
	return t.base.RoundTrip(request)
}

// validateAgentInput checks the input against the tool's manifest schema,
// failing on a tool that doesn't exist or a key it doesn't take
func validateAgentInput(ctx context.Context, name string, input map[string]any) error {
	manifest, err := agentManifestFor(ctx)
	if err != nil {
		return err
	}
	for _, tool := range manifest.Tools {
		if tool.Name != name {
			continue
		}
		encoded, err := json.Marshal(tool.Input)
		if err != nil {
			return fmt.Errorf("encode %s's input schema: %v", name, err)
		}
		var schema jsonschema.Schema
		if err := json.Unmarshal(encoded, &schema); err != nil {
			return fmt.Errorf("decode %s's input schema: %v", name, err)
		}
		resolved, err := schema.Resolve(nil)
		if err != nil {
			return fmt.Errorf("resolve %s's input schema: %v", name, err)
		}
		if err := resolved.Validate(input); err != nil {
			return fmt.Errorf("invalid input for %s: %v", name, err)
		}
		return nil
	}
	return fmt.Errorf("no tool %s, see system-bridge agent tools", name)
}

// agentCall runs one tool on the running backend and returns its result as JSON
func agentCall(ctx context.Context, name string, input map[string]any) ([]byte, error) {
	if err := validateAgentInput(ctx, name, input); err != nil {
		return nil, err
	}

	token, err := utils.LoadToken()
	if err != nil {
		return nil, fmt.Errorf("load token: %w", err)
	}

	ctx, cancel := context.WithTimeout(ctx, agentTimeout(name))
	defer cancel()

	client := sdkmcp.NewClient(&sdkmcp.Implementation{Name: "system-bridge-agent", Version: version.Version}, nil)
	session, err := client.Connect(ctx, &sdkmcp.StreamableClientTransport{
		Endpoint:   fmt.Sprintf("http://127.0.0.1:%d/api/mcp", utils.GetPort()),
		HTTPClient: &http.Client{Transport: bearerTransport{token: token, base: http.DefaultTransport}},
		MaxRetries: -1,
	}, nil)
	if err != nil {
		return nil, fmt.Errorf("could not reach the System Bridge backend (is it running?): %v", err)
	}
	defer func() { _ = session.Close() }()

	result, err := session.CallTool(ctx, &sdkmcp.CallToolParams{Name: agentToolPrefix + name, Arguments: input})
	if err != nil {
		if ctx.Err() != nil {
			return nil, fmt.Errorf("%s timed out after %s", name, agentTimeout(name))
		}
		return nil, fmt.Errorf("call %s: %v", name, err)
	}

	text := []string{}
	for _, content := range result.Content {
		if textContent, ok := content.(*sdkmcp.TextContent); ok {
			text = append(text, textContent.Text)
		}
	}
	if result.IsError {
		return nil, fmt.Errorf("%s", strings.Join(text, "\n"))
	}
	if result.StructuredContent != nil {
		return json.MarshalIndent(result.StructuredContent, "", "  ")
	}
	// Every tool returns structured content; this keeps any other result JSON
	return json.MarshalIndent(map[string]any{"text": strings.Join(text, "\n")}, "", "  ")
}

func agentCommand() *cli.Command {
	return &cli.Command{
		Name:  "agent",
		Usage: "The Code Mode tools agent plugins register, from the MCP server's tools",
		Commands: []*cli.Command{
			{
				Name:  "tools",
				Usage: "Print the Code Mode tools as JSON, and whether this machine has a backend to call",
				Flags: []cli.Flag{
					&cli.BoolFlag{Name: "json", Usage: "Print as JSON (the only format)", Value: true},
				},
				Action: func(cmdCtx context.Context, cmd *cli.Command) error {
					manifest, err := agentManifestFor(cmdCtx)
					if err != nil {
						return err
					}
					out, err := json.MarshalIndent(manifest, "", "  ")
					if err != nil {
						return fmt.Errorf("encode the manifest: %w", err)
					}
					_, err = fmt.Fprintln(cmd.Root().Writer, string(out))
					return err
				},
			},
			{
				Name:      "call",
				Usage:     "Run a Code Mode tool with its input as JSON on stdin and print its result as JSON",
				ArgsUsage: "<tool>",
				Action: func(cmdCtx context.Context, cmd *cli.Command) error {
					name := cmd.Args().First()
					if name == "" {
						return fmt.Errorf("a tool name is required, from system-bridge agent tools")
					}
					raw, err := io.ReadAll(os.Stdin)
					if err != nil {
						return fmt.Errorf("read the input: %w", err)
					}
					input := map[string]any{}
					if strings.TrimSpace(string(raw)) != "" {
						if err := json.Unmarshal(raw, &input); err != nil {
							return fmt.Errorf("the input must be a JSON object: %w", err)
						}
					}
					out, err := agentCall(cmdCtx, name, input)
					if err != nil {
						return err
					}
					_, err = fmt.Fprintln(cmd.Root().Writer, string(out))
					return err
				},
			},
		},
	}
}
