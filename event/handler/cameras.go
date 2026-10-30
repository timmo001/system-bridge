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
	ID string `json:"id" mapstructure:"id"`
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
			return required(request.ID, "No camera id provided")
		},
		func(ctx context.Context, request CameraCaptureRequestData) (*types.CameraPicture, error) {
			image, err := cameras.Capture(ctx, request.ID)
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
