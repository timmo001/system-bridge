package event_handler

import (
	"fmt"

	"github.com/charmbracelet/log"
	"github.com/mitchellh/mapstructure"
	"github.com/timmo001/system-bridge/event"
	"github.com/timmo001/system-bridge/settings"
	"github.com/timmo001/system-bridge/utils/handlers/command"
)

type RunCommandRequestData struct {
	Name string `json:"name" mapstructure:"name"`
}

type RunCommandResponseData struct {
	Name    string                 `json:"name" mapstructure:"name"`
	Command string                 `json:"command" mapstructure:"command"`
	Args    []string               `json:"args" mapstructure:"args"`
	Result  *command.CommandResult `json:"result" mapstructure:"result"`
}

func RegisterRunCommandHandler(router *event.MessageRouter) {
	router.RegisterSimpleHandler(event.EventRunCommand, func(connection string, message event.Message) event.MessageResponse {
		log.Infof("Received run command event: %v", message)

		data := RunCommandRequestData{}
		err := mapstructure.Decode(message.Data, &data)
		if err != nil {
			log.Errorf("Failed to decode run command event data: %v", err)
			return event.MessageResponse{
				ID:      message.ID,
				Type:    event.ResponseTypeError,
				Subtype: event.ResponseSubtypeNone,
				Message: "Failed to decode run command event data",
			}
		}

		// Validate required fields
		if data.Name == "" {
			log.Error("No command name provided")
			return event.MessageResponse{
				ID:      message.ID,
				Type:    event.ResponseTypeError,
				Subtype: event.ResponseSubtypeMissingCommand,
				Message: "No command name provided",
			}
		}

		// Load settings to get allowed commands
		cfg, err := settings.Load()
		if err != nil {
			log.Errorf("Failed to load settings: %v", err)
			return event.MessageResponse{
				ID:      message.ID,
				Type:    event.ResponseTypeError,
				Subtype: event.ResponseSubtypeNone,
				Message: "Failed to load settings",
			}
		}

		// Find the command in the allow-list
		var allowedCommand *settings.SettingsCommand
		for _, cmd := range cfg.Commands.Commands {
			if cmd.Name == data.Name {
				allowedCommand = &cmd
				break
			}
		}

		if allowedCommand == nil {
			log.Errorf("Command not found in allow-list: %s", data.Name)
			return event.MessageResponse{
				ID:      message.ID,
				Type:    event.ResponseTypeError,
				Subtype: event.ResponseSubtypeCommandNotFound,
				Message: fmt.Sprintf("Command '%s' not found in allow-list", data.Name),
			}
		}

		if !allowedCommand.Enabled {
			log.Errorf("Command is disabled: %s", data.Name)
			return event.MessageResponse{
				ID:      message.ID,
				Type:    event.ResponseTypeError,
				Subtype: event.ResponseSubtypeCommandNotAllowed,
				Message: fmt.Sprintf("Command '%s' is disabled", data.Name),
			}
		}

		// Validate the command
		err = command.ValidateCommand(allowedCommand.Command)
		if err != nil {
			log.Errorf("Command validation failed: %v", err)
			return event.MessageResponse{
				ID:      message.ID,
				Type:    event.ResponseTypeError,
				Subtype: event.ResponseSubtypeNone,
				Message: fmt.Sprintf("Command validation failed: %v", err),
			}
		}

		// Get platform-specific command
		platformCommand, platformArgs, err := command.GetPlatformSpecificCommand(allowedCommand.Command, allowedCommand.Args)
		if err != nil {
			log.Errorf("Failed to get platform-specific command: %v", err)
			return event.MessageResponse{
				ID:      message.ID,
				Type:    event.ResponseTypeError,
				Subtype: event.ResponseSubtypeNone,
				Message: fmt.Sprintf("Failed to get platform-specific command: %v", err),
			}
		}

		// Execute the command
		result, err := command.ExecuteCommand(platformCommand, platformArgs)
		if err != nil {
			log.Errorf("Failed to execute command: %v", err)
			return event.MessageResponse{
				ID:      message.ID,
				Type:    event.ResponseTypeError,
				Subtype: event.ResponseSubtypeNone,
				Message: fmt.Sprintf("Failed to execute command: %v", err),
			}
		}

		responseData := RunCommandResponseData{
			Name:    allowedCommand.Name,
			Command: platformCommand,
			Args:    platformArgs,
			Result:  result,
		}

		return event.MessageResponse{
			ID:      message.ID,
			Type:    event.ResponseTypeCommandExecuted,
			Subtype: event.ResponseSubtypeNone,
			Data:    responseData,
			Message: fmt.Sprintf("Command '%s' executed successfully", data.Name),
		}
	})
}
