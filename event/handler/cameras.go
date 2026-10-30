package event_handler

import (
	"cmp"
	"context"
	"time"

	"github.com/timmo001/system-bridge/data"
	"github.com/timmo001/system-bridge/data/module/cameras"
	"github.com/timmo001/system-bridge/event"
	"github.com/timmo001/system-bridge/types"
)

// cameraTimeout allows for a UVC camera, which can take a moment to answer
// over USB
const cameraTimeout = 10 * time.Second

type CameraControlRequestData struct {
	ID      string `json:"id" mapstructure:"id"`
	Control string `json:"control" mapstructure:"control"`
	Value   *int64 `json:"value" mapstructure:"value"`
}

func RegisterCameraHandlers(router *event.MessageRouter, dataStore *data.DataStore) {
	registerAction(router, dataStore, types.ModuleCameras, cameraTimeout, event.EventCameraControl, event.ResponseTypeCameraControlled, "Camera control set",
		func(request CameraControlRequestData) string {
			if request.Value == nil {
				return "Provide a value"
			}
			return cmp.Or(required(request.ID, "No camera id provided"), required(request.Control, "No control provided"))
		},
		func(ctx context.Context, request CameraControlRequestData) error {
			return cameras.SetControl(ctx, request.ID, request.Control, *request.Value)
		})
}
