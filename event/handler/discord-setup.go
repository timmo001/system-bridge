package event_handler

import (
	"log/slog"

	"github.com/go-viper/mapstructure/v2"
	"github.com/timmo001/system-bridge/discord"
	"github.com/timmo001/system-bridge/event"
)

type DiscordSetupRequestData struct {
	ClientID     string `json:"clientId" mapstructure:"clientId"`
	ClientSecret string `json:"clientSecret" mapstructure:"clientSecret"`
}

// RegisterGetDiscordSetupHandler reports how far Discord is set up. The
// client secret is never sent back.
func RegisterGetDiscordSetupHandler(router *event.MessageRouter) {
	router.RegisterSimpleHandler(event.EventGetDiscordSetup, func(connection string, message event.Message) event.MessageResponse {
		return event.MessageResponse{
			ID:      message.ID,
			Type:    event.ResponseTypeDiscordSetup,
			Subtype: event.ResponseSubtypeNone,
			Data:    discord.GetSetup(),
			Message: "Got Discord setup",
		}
	})
}

// RegisterUpdateDiscordSetupHandler saves the Discord application to
// authorize as, then connects to Discord.
func RegisterUpdateDiscordSetupHandler(router *event.MessageRouter) {
	router.RegisterSimpleHandler(event.EventUpdateDiscordSetup, func(connection string, message event.Message) event.MessageResponse {
		// Logged without the data, which holds the client secret
		slog.Info("Received Discord setup update")

		var data DiscordSetupRequestData
		if err := mapstructure.Decode(message.Data, &data); err != nil {
			return event.MessageResponse{
				ID:      message.ID,
				Type:    event.ResponseTypeError,
				Subtype: event.ResponseSubtypeBadRequest,
				Message: "Invalid request data format: " + err.Error(),
			}
		}

		err := discord.SaveCredentials(discord.Credentials{
			ClientID:     data.ClientID,
			ClientSecret: data.ClientSecret,
		})
		if err != nil {
			slog.Warn("Failed to save Discord credentials", "error", err)
			return event.MessageResponse{
				ID:      message.ID,
				Type:    event.ResponseTypeError,
				Subtype: event.ResponseSubtypeBadRequest,
				Message: err.Error(),
			}
		}

		return event.MessageResponse{
			ID:      message.ID,
			Type:    event.ResponseTypeDiscordSetupUpdated,
			Subtype: event.ResponseSubtypeNone,
			Data:    discord.GetSetup(),
			Message: "Saved Discord setup",
		}
	})
}
