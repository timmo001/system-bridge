package event_handler

import (
	"context"
	"errors"
	"log/slog"
	"time"

	"github.com/mitchellh/mapstructure"
	"github.com/timmo001/system-bridge/data"
	"github.com/timmo001/system-bridge/data/module/audio"
	"github.com/timmo001/system-bridge/event"
	"github.com/timmo001/system-bridge/types"
)

type AudioControlRequestData struct {
	ID      string   `json:"id" mapstructure:"id"`
	Volume  *float64 `json:"volume" mapstructure:"volume"`
	Muted   *bool    `json:"muted" mapstructure:"muted"`
	Default bool     `json:"default" mapstructure:"default"`
}

func RegisterAudioControlHandler(router *event.MessageRouter, dataStore *data.DataStore) {
	router.RegisterSimpleHandler(event.EventAudioControl, func(connection string, message event.Message) event.MessageResponse {
		slog.Debug("Received audio control event", "message", message)

		errorResponse := func(subtype event.ResponseSubtype, msg string) event.MessageResponse {
			return event.MessageResponse{
				ID:      message.ID,
				Type:    event.ResponseTypeError,
				Subtype: subtype,
				Message: msg,
			}
		}

		data := AudioControlRequestData{}
		dc := &mapstructure.DecoderConfig{WeaklyTypedInput: true, Result: &data}
		dec, err := mapstructure.NewDecoder(dc)
		if err == nil {
			err = dec.Decode(message.Data)
		}
		if err != nil {
			slog.Error("Failed to decode audio control event data", "error", err)
			return errorResponse(event.ResponseSubtypeNone, "Failed to decode audio control event data")
		}

		if data.ID == "" {
			return errorResponse(event.ResponseSubtypeBadRequest, "No audio device id provided")
		}
		if data.Volume == nil && data.Muted == nil && !data.Default {
			return errorResponse(event.ResponseSubtypeMissingValue, "Provide a volume, a mute state or default")
		}
		if data.Volume != nil && (*data.Volume < 0 || *data.Volume > 100) {
			return errorResponse(event.ResponseSubtypeBadRequest, "Volume must be between 0 and 100")
		}

		ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
		defer cancel()

		if data.Volume != nil {
			if err := audio.SetVolume(ctx, data.ID, *data.Volume); err != nil {
				slog.Error("Failed to set audio volume", "device", data.ID, "error", err)
				return audioControlError(message.ID, err, "Failed to set audio volume: "+err.Error())
			}
		}
		if data.Muted != nil {
			if err := audio.SetMuted(ctx, data.ID, *data.Muted); err != nil {
				slog.Error("Failed to set audio mute", "device", data.ID, "error", err)
				return audioControlError(message.ID, err, "Failed to set audio mute: "+err.Error())
			}
		}
		if data.Default {
			if err := audio.SetDefault(ctx, data.ID); err != nil {
				slog.Error("Failed to set the default audio device", "device", data.ID, "error", err)
				return audioControlError(message.ID, err, "Failed to set the default audio device: "+err.Error())
			}
		}

		if dataStore != nil {
			if err := dataStore.TriggerModuleUpdate(types.ModuleAudio); err != nil {
				slog.Warn("Failed to trigger audio module update", "error", err)
			}
		}

		return event.MessageResponse{
			ID:      message.ID,
			Type:    event.ResponseTypeAudioControlled,
			Subtype: event.ResponseSubtypeNone,
			Data:    message.Data,
			Message: "Audio controlled",
		}
	})
}

func audioControlError(id string, err error, msg string) event.MessageResponse {
	subtype := event.ResponseSubtypeNone
	switch {
	case errors.Is(err, audio.ErrUnsupported):
		subtype = event.ResponseSubtypeInvalidAction
	case errors.Is(err, audio.ErrUnknownDevice):
		subtype = event.ResponseSubtypeBadRequest
	}
	return event.MessageResponse{
		ID:      id,
		Type:    event.ResponseTypeError,
		Subtype: subtype,
		Message: msg,
	}
}
