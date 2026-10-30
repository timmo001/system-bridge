package main

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"os"
	"strconv"
	"strings"

	"github.com/timmo001/system-bridge/client"
	"github.com/timmo001/system-bridge/event"
	"github.com/timmo001/system-bridge/types"
	"github.com/urfave/cli/v3"
)

func cameraCommand() *cli.Command {
	return &cli.Command{
		Name:  "camera",
		Usage: "Control webcams and take pictures with them",
		Commands: []*cli.Command{
			{
				Name:      "capture",
				Usage:     "Take a picture with a camera and save it as a JPEG, or write it to the output with -",
				ArgsUsage: "<camera id> <file>",
				Flags: []cli.Flag{
					&cli.StringFlag{Name: "size", Usage: "One of the camera's sizes, such as 1920x1080, instead of its current size"},
				},
				Action: func(cmdCtx context.Context, cmd *cli.Command) error {
					if cmd.Args().Len() != 2 {
						return fmt.Errorf("give a camera id and a file to save the picture to")
					}
					request := map[string]any{"id": cmd.Args().Get(0)}
					if size := cmd.String("size"); size != "" {
						width, height, ok := strings.Cut(size, "x")
						w, wErr := strconv.ParseInt(width, 10, 64)
						h, hErr := strconv.ParseInt(height, 10, 64)
						if !ok || wErr != nil || hErr != nil {
							return fmt.Errorf("give the size as a width and height, such as 1920x1080")
						}
						request["width"], request["height"] = w, h
					}
					reply, err := client.RequestWithin(cmdCtx, client.SlowSendTimeout, event.EventCameraCapture, request)
					if err != nil {
						return err
					}
					var picture types.CameraPicture
					if err := json.Unmarshal(reply, &picture); err != nil {
						return fmt.Errorf("decode picture: %w", err)
					}
					image, err := base64.StdEncoding.DecodeString(picture.Image)
					if err != nil {
						return fmt.Errorf("decode picture: %w", err)
					}
					if path := cmd.Args().Get(1); path != "-" {
						return os.WriteFile(path, image, 0o600)
					}
					_, err = os.Stdout.Write(image)
					return err
				},
			},
			{
				Name:      "control",
				Usage:     "Set one of a camera's controls, such as its brightness or zoom",
				ArgsUsage: "<camera id> <control id> <value>",
				Action: func(cmdCtx context.Context, cmd *cli.Command) error {
					if cmd.Args().Len() != 3 {
						return fmt.Errorf("give a camera id, a control id and a value")
					}
					value, err := strconv.ParseInt(cmd.Args().Get(2), 10, 64)
					if err != nil {
						return fmt.Errorf("the value must be a whole number")
					}
					return client.SendWithin(cmdCtx, client.SlowSendTimeout, event.EventCameraControl, map[string]any{
						"id":      cmd.Args().Get(0),
						"control": cmd.Args().Get(1),
						"value":   value,
					})
				},
			},
		},
	}
}
