package event_handler

import (
	"context"
	"errors"
	"log/slog"

	"github.com/mitchellh/mapstructure"
	"github.com/timmo001/system-bridge/discord"
	"github.com/timmo001/system-bridge/event"
)

type DiscordControlRequestData struct {
	Action   string   `json:"action" mapstructure:"action"`
	Value    *float64 `json:"value" mapstructure:"value"`
	DeviceID string   `json:"device_id" mapstructure:"device_id"`
	Mode     string   `json:"mode" mapstructure:"mode"`
}

func RegisterDiscordControlHandler(router *event.MessageRouter) {
	router.RegisterSimpleHandler(event.EventDiscordControl, func(connection string, message event.Message) event.MessageResponse {
		slog.Debug("Received Discord control event", "message", message)

		data := DiscordControlRequestData{}
		dc := &mapstructure.DecoderConfig{WeaklyTypedInput: true, Result: &data}
		dec, err := mapstructure.NewDecoder(dc)
		if err == nil {
			err = dec.Decode(message.Data)
		}
		if err != nil {
			slog.Error("Failed to decode Discord control event data", "error", err)
			return event.MessageResponse{
				ID:      message.ID,
				Type:    event.ResponseTypeError,
				Subtype: event.ResponseSubtypeBadRequest,
				Message: "Failed to decode Discord control event data",
			}
		}

		if data.Action == "" {
			return event.MessageResponse{
				ID:      message.ID,
				Type:    event.ResponseTypeError,
				Subtype: event.ResponseSubtypeMissingAction,
				Message: "No action provided for Discord control",
			}
		}

		err = discord.Control(context.Background(), discord.Action(data.Action), discord.ControlParams{
			Value:    data.Value,
			DeviceID: data.DeviceID,
			Mode:     data.Mode,
		})
		if err != nil {
			slog.Error("Failed to control Discord", "action", data.Action, "error", err)
			subtype := event.ResponseSubtypeNone
			switch {
			case errors.Is(err, discord.ErrInvalidAction):
				subtype = event.ResponseSubtypeInvalidAction
			case errors.Is(err, discord.ErrInvalidValue):
				subtype = event.ResponseSubtypeBadRequest
			}
			return event.MessageResponse{
				ID:      message.ID,
				Type:    event.ResponseTypeError,
				Subtype: subtype,
				Message: err.Error(),
			}
		}

		return event.MessageResponse{
			ID:      message.ID,
			Type:    event.ResponseTypeDiscordControlled,
			Subtype: event.ResponseSubtypeNone,
			Data:    message.Data,
			Message: "Discord controlled",
		}
	})
}
