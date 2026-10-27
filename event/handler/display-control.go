package event_handler

import (
	"context"
	"errors"
	"log/slog"
	"time"

	"github.com/go-viper/mapstructure/v2"
	"github.com/timmo001/system-bridge/data"
	"github.com/timmo001/system-bridge/data/module/displays"
	"github.com/timmo001/system-bridge/event"
	"github.com/timmo001/system-bridge/types"
)

type DisplayControlRequestData struct {
	ID         string   `json:"id" mapstructure:"id"`
	Brightness *float64 `json:"brightness" mapstructure:"brightness"`
	PowerState string   `json:"power_state" mapstructure:"power_state"`
}

func RegisterDisplayControlHandler(router *event.MessageRouter, dataStore *data.DataStore) {
	router.RegisterSimpleHandler(event.EventDisplayControl, func(connection string, message event.Message) event.MessageResponse {
		slog.Debug("Received display control event", "message", message)

		errorResponse := func(subtype event.ResponseSubtype, msg string) event.MessageResponse {
			return event.MessageResponse{
				ID:      message.ID,
				Type:    event.ResponseTypeError,
				Subtype: subtype,
				Message: msg,
			}
		}

		data := DisplayControlRequestData{}
		dc := &mapstructure.DecoderConfig{WeaklyTypedInput: true, Result: &data}
		dec, err := mapstructure.NewDecoder(dc)
		if err == nil {
			err = dec.Decode(message.Data)
		}
		if err != nil {
			slog.Error("Failed to decode display control event data", "error", err)
			return errorResponse(event.ResponseSubtypeNone, "Failed to decode display control event data")
		}

		if data.ID == "" {
			return errorResponse(event.ResponseSubtypeBadRequest, "No display id provided")
		}
		if data.Brightness == nil && data.PowerState == "" {
			return errorResponse(event.ResponseSubtypeMissingValue, "Provide a brightness or a power state")
		}
		if data.Brightness != nil && (*data.Brightness < 0 || *data.Brightness > 100) {
			return errorResponse(event.ResponseSubtypeBadRequest, "Brightness must be between 0 and 100")
		}

		ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
		defer cancel()

		if data.Brightness != nil {
			if err := displays.SetBrightness(ctx, data.ID, *data.Brightness); err != nil {
				slog.Error("Failed to set display brightness", "display", data.ID, "error", err)
				return controlError(message.ID, err, "Failed to set display brightness: "+err.Error())
			}
		}
		if data.PowerState != "" {
			if err := displays.SetPowerState(ctx, data.ID, types.DisplayPowerState(data.PowerState)); err != nil {
				slog.Error("Failed to set display power state", "display", data.ID, "error", err)
				return controlError(message.ID, err, "Failed to set display power state: "+err.Error())
			}
		}

		if dataStore != nil {
			if err := dataStore.TriggerModuleUpdate(types.ModuleDisplays); err != nil {
				slog.Warn("Failed to trigger displays module update", "error", err)
			}
		}

		return event.MessageResponse{
			ID:      message.ID,
			Type:    event.ResponseTypeDisplayControlled,
			Subtype: event.ResponseSubtypeNone,
			Data:    message.Data,
			Message: "Display controlled",
		}
	})
}

func controlError(id string, err error, msg string) event.MessageResponse {
	subtype := event.ResponseSubtypeNone
	if errors.Is(err, displays.ErrUnsupported) {
		subtype = event.ResponseSubtypeInvalidAction
	}
	return event.MessageResponse{
		ID:      id,
		Type:    event.ResponseTypeError,
		Subtype: subtype,
		Message: msg,
	}
}
