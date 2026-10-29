package main

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"os"
	"strings"

	"github.com/timmo001/system-bridge/client"
	"github.com/timmo001/system-bridge/event"
	"github.com/timmo001/system-bridge/types"
	"github.com/urfave/cli/v3"
)

func clipboardCommand() *cli.Command {
	return &cli.Command{
		Name:  "clipboard",
		Usage: "Read or set the backend system's clipboard",
		Commands: []*cli.Command{
			{
				Name:  "get",
				Usage: "Print the text on the clipboard",
				Action: func(cmdCtx context.Context, cmd *cli.Command) error {
					raw, err := client.Request(cmdCtx, event.EventClipboardGetText, map[string]any{})
					if err != nil {
						return err
					}
					var clipboard types.ClipboardText
					if err := json.Unmarshal(raw, &clipboard); err != nil {
						return fmt.Errorf("decode the clipboard: %w", err)
					}
					_, err = fmt.Fprint(cmd.Root().Writer, clipboard.Text)
					return err
				},
			},
			{
				Name:      "set",
				Usage:     "Put text on the clipboard, or what's piped in when there's none",
				ArgsUsage: "[text]",
				Action: func(cmdCtx context.Context, cmd *cli.Command) error {
					text := strings.Join(cmd.Args().Slice(), " ")
					if text == "" {
						piped, err := io.ReadAll(os.Stdin)
						if err != nil {
							return fmt.Errorf("read the text to set: %w", err)
						}
						text = string(piped)
					}
					if text == "" {
						return fmt.Errorf("text is required, as an argument or piped in")
					}
					return client.Send(cmdCtx, event.EventClipboardSetText, map[string]any{"text": text})
				},
			},
		},
	}
}
