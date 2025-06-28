package http

import (
	"encoding/json"
	"net/http"

	"github.com/charmbracelet/log"
	event_handler "github.com/timmo001/system-bridge/event/handler"
	"github.com/timmo001/system-bridge/settings"
	"github.com/timmo001/system-bridge/utils/handlers/command"
)

type CommandExecutionRequest struct {
	Name string `json:"name"`
}

type CommandExecutionResponse struct {
	APIResponse
	Data *event_handler.RunCommandResponseData `json:"data,omitempty"`
}

// HandleCommands handles command-related HTTP requests
func HandleCommands(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodPost:
		handleCommandExecution(w, r)
	case http.MethodGet:
		handleCommandsList(w, r)
	default:
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
	}
}

func handleCommandExecution(w http.ResponseWriter, r *http.Request) {
	log.Info("POST: /api/commands")

	// Parse request body
	var req CommandExecutionRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		log.Errorf("Failed to decode request body: %v", err)
		response := CommandExecutionResponse{
			APIResponse: APIResponse{
				Status:  "error",
				Message: "Invalid request body",
			},
		}
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(response)
		return
	}

	// Validate required fields
	if req.Name == "" {
		log.Error("No command name provided")
		response := CommandExecutionResponse{
			APIResponse: APIResponse{
				Status:  "error",
				Message: "Command name is required",
			},
		}
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(response)
		return
	}

	// Load settings to get allowed commands
	cfg, err := settings.Load()
	if err != nil {
		log.Errorf("Failed to load settings: %v", err)
		response := CommandExecutionResponse{
			APIResponse: APIResponse{
				Status:  "error",
				Message: "Failed to load settings",
			},
		}
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(response)
		return
	}

	// Find the command in the allow-list
	var allowedCommand *settings.SettingsCommand
	for _, cmd := range cfg.Commands.Commands {
		if cmd.Name == req.Name {
			allowedCommand = &cmd
			break
		}
	}

	if allowedCommand == nil {
		log.Errorf("Command not found in allow-list: %s", req.Name)
		response := CommandExecutionResponse{
			APIResponse: APIResponse{
				Status:  "error",
				Message: "Command not found in allow-list",
			},
		}
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusNotFound)
		json.NewEncoder(w).Encode(response)
		return
	}

	if !allowedCommand.Enabled {
		log.Errorf("Command is disabled: %s", req.Name)
		response := CommandExecutionResponse{
			APIResponse: APIResponse{
				Status:  "error",
				Message: "Command is disabled",
			},
		}
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusForbidden)
		json.NewEncoder(w).Encode(response)
		return
	}

	// Validate the command
	err = command.ValidateCommand(allowedCommand.Command)
	if err != nil {
		log.Errorf("Command validation failed: %v", err)
		response := CommandExecutionResponse{
			APIResponse: APIResponse{
				Status:  "error",
				Message: "Command validation failed",
			},
		}
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(response)
		return
	}

	// Get platform-specific command
	platformCommand, platformArgs, err := command.GetPlatformSpecificCommand(allowedCommand.Command, allowedCommand.Args)
	if err != nil {
		log.Errorf("Failed to get platform-specific command: %v", err)
		response := CommandExecutionResponse{
			APIResponse: APIResponse{
				Status:  "error",
				Message: "Failed to get platform-specific command",
			},
		}
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(response)
		return
	}

	// Execute the command
	result, err := command.ExecuteCommand(platformCommand, platformArgs)
	if err != nil {
		log.Errorf("Failed to execute command: %v", err)
		response := CommandExecutionResponse{
			APIResponse: APIResponse{
				Status:  "error",
				Message: "Failed to execute command",
			},
		}
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(response)
		return
	}

	responseData := &event_handler.RunCommandResponseData{
		Name:    allowedCommand.Name,
		Command: platformCommand,
		Args:    platformArgs,
		Result:  result,
	}

	response := CommandExecutionResponse{
		APIResponse: APIResponse{
			Status:  "success",
			Message: "Command executed successfully",
		},
		Data: responseData,
	}

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(response); err != nil {
		log.Error("Failed to encode response", "error", err)
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}
}

func handleCommandsList(w http.ResponseWriter, r *http.Request) {
	log.Info("GET: /api/commands")

	// Load settings to get configured commands
	cfg, err := settings.Load()
	if err != nil {
		log.Errorf("Failed to load settings: %v", err)
		response := APIResponse{
			Status:  "error",
			Message: "Failed to load settings",
		}
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(response)
		return
	}

	// Filter to only return enabled commands (for security)
	enabledCommands := make([]settings.SettingsCommand, 0)
	for _, cmd := range cfg.Commands.Commands {
		if cmd.Enabled {
			enabledCommands = append(enabledCommands, cmd)
		}
	}

	response := APIResponse{
		Status:  "success",
		Message: "Commands retrieved successfully",
		Data:    enabledCommands,
	}

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(response); err != nil {
		log.Error("Failed to encode response", "error", err)
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}
}
