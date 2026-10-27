package event_handler

import (
	"log/slog"

	"github.com/go-viper/mapstructure/v2"
	"github.com/timmo001/system-bridge/data"
	"github.com/timmo001/system-bridge/event"
	"github.com/timmo001/system-bridge/types"
	"github.com/timmo001/system-bridge/utils/handlers/media"
)

type MediaControlRequestData struct {
	Action string `json:"action" mapstructure:"action"`
	// A player's id from the media module's players. Leave it out for the
	// player the module reports.
	Player   string   `json:"player,omitempty" mapstructure:"player"`
	Position *float64 `json:"position,omitempty" mapstructure:"position"` // Seconds, for SEEK
	Volume   *float64 `json:"volume,omitempty" mapstructure:"volume"`     // 0 to 1, for SET_VOLUME
	Shuffle  *bool    `json:"shuffle,omitempty" mapstructure:"shuffle"`   // For SET_SHUFFLE
	Repeat   string   `json:"repeat,omitempty" mapstructure:"repeat"`     // NONE, TRACK or LIST, for SET_REPEAT
}

func RegisterMediaControlHandler(router *event.MessageRouter, dataStore *data.DataStore) {
	router.RegisterSimpleHandler(event.EventMediaControl, func(connection string, message event.Message) event.MessageResponse {
		slog.Debug("Received media control event", "message", message)

		data := MediaControlRequestData{}
		err := mapstructure.Decode(message.Data, &data)
		if err != nil {
			slog.Error("Failed to decode media control event data", "error", err)
			return event.MessageResponse{
				ID:      message.ID,
				Type:    event.ResponseTypeError,
				Subtype: event.ResponseSubtypeNone,
				Message: "Failed to decode media control event data",
			}
		}

		// Validate action data
		if data.Action == "" {
			slog.Error("No action provided for media control")
			return event.MessageResponse{
				ID:      message.ID,
				Type:    event.ResponseTypeError,
				Subtype: event.ResponseSubtypeBadRequest,
				Message: "No action provided for media control",
			}
		}

		err = media.Control(media.Request{
			Action:   media.MediaAction(data.Action),
			Player:   data.Player,
			Position: data.Position,
			Volume:   data.Volume,
			Shuffle:  data.Shuffle,
			Repeat:   data.Repeat,
		})
		if err != nil {
			slog.Error("Failed to control media", "error", err)
			return event.MessageResponse{
				ID:      message.ID,
				Type:    event.ResponseTypeError,
				Subtype: event.ResponseSubtypeNone,
				Message: "Failed to control media: " + err.Error(),
			}
		}

		// Trigger an update to the media module
		if dataStore != nil {
			if err := dataStore.TriggerModuleUpdate(types.ModuleMedia); err != nil {
				slog.Warn("Failed to trigger media module update", "error", err)
			} else {
				slog.Debug("Triggered media module update after media control action", "action", data.Action)
			}
		}

		return event.MessageResponse{
			ID:      message.ID,
			Type:    event.ResponseTypeMediaControlled,
			Subtype: event.ResponseSubtypeNone,
			Data:    message.Data,
			Message: "Media controlled",
		}
	})
}
