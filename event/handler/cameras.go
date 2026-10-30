package event_handler

import (
	"cmp"
	"context"
	"encoding/base64"
	"log/slog"
	"time"

	"github.com/timmo001/system-bridge/data"
	"github.com/timmo001/system-bridge/data/module/cameras"
	"github.com/timmo001/system-bridge/event"
	"github.com/timmo001/system-bridge/types"
)

// cameraTimeout allows for a UVC camera, which can take a moment to answer
// over USB
const cameraTimeout = 10 * time.Second

// cameraCaptureTimeout allows for starting a camera and letting it settle
const cameraCaptureTimeout = 20 * time.Second

type CameraControlRequestData struct {
	ID      string `json:"id" mapstructure:"id"`
	Control string `json:"control" mapstructure:"control"`
	Value   *int64 `json:"value" mapstructure:"value"`
}

type CameraCaptureRequestData struct {
	ID     string `json:"id" mapstructure:"id"`
	Width  *int64 `json:"width" mapstructure:"width"` // With height, one of the camera's sizes. Without, its current size
	Height *int64 `json:"height" mapstructure:"height"`
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

	registerQuery(router, cameraCaptureTimeout, event.EventCameraCapture, event.ResponseTypeCameraCaptured, "Picture taken",
		func(request CameraCaptureRequestData) string {
			if (request.Width == nil) != (request.Height == nil) {
				return "Provide both a width and a height, or neither"
			}
			if request.Width != nil && (*request.Width <= 0 || *request.Height <= 0) {
				return "The width and height must be above 0"
			}
			return required(request.ID, "No camera id provided")
		},
		func(ctx context.Context, request CameraCaptureRequestData) (*types.CameraPicture, error) {
			var size *types.CameraSize
			if request.Width != nil {
				size = &types.CameraSize{Width: *request.Width, Height: *request.Height}
			}
			image, err := cameras.Capture(ctx, request.ID, size)
			// Starting and stopping a camera changes what's using it, so
			// refresh both whether or not the picture was taken
			if dataStore != nil {
				for _, module := range []types.ModuleName{types.ModuleCameras, types.ModuleSystem} {
					if err := dataStore.TriggerModuleUpdate(module); err != nil {
						slog.Warn("Failed to trigger module update", "module", module, "error", err)
					}
				}
			}
			if err != nil {
				return nil, err
			}
			return &types.CameraPicture{
				ID:          request.ID,
				ContentType: "image/jpeg",
				Image:       base64.StdEncoding.EncodeToString(image),
			}, nil
		})
}
