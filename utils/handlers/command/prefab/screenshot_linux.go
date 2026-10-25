//go:build linux

package prefab

import (
	"context"
	"errors"
	"fmt"
	"io"
	"net/url"
	"os"
	"strconv"
	"time"

	"github.com/godbus/dbus/v5"
)

// Desktops without a screenshot tool System Bridge knows capture through the
// desktop portal, which needs no extra program
var (
	screenshotBuiltin       Builtin     = portalScreenshot
	screenshotBuiltinWhen   func() bool = portalAvailable
	screenshotWindowBuiltin Builtin
)

const portalName = "org.freedesktop.portal.Desktop"

// portalAvailable reports whether a desktop portal is running, or can be
// started, on the session bus
func portalAvailable() bool {
	conn, err := dbus.ConnectSessionBus()
	if err != nil {
		return false
	}
	defer func() { _ = conn.Close() }()

	var running bool
	if err := conn.BusObject().Call("org.freedesktop.DBus.NameHasOwner", 0, portalName).Store(&running); err == nil && running {
		return true
	}
	var activatable []string
	if err := conn.BusObject().Call("org.freedesktop.DBus.ListActivatableNames", 0).Store(&activatable); err != nil {
		return false
	}
	for _, name := range activatable {
		if name == portalName {
			return true
		}
	}
	return false
}

// portalScreenshot asks the desktop portal for a screenshot without its
// dialog, then moves the file it saves to the first argument
func portalScreenshot(ctx context.Context, arguments []string) error {
	if len(arguments) == 0 {
		return errors.New("no file to save the screenshot to")
	}

	conn, err := dbus.ConnectSessionBus()
	if err != nil {
		return fmt.Errorf("connect to the session bus: %w", err)
	}
	defer func() { _ = conn.Close() }()

	// Listen before asking, so a quick answer isn't missed
	signals := make(chan *dbus.Signal, 4)
	conn.Signal(signals)
	if err := conn.AddMatchSignal(
		dbus.WithMatchInterface("org.freedesktop.portal.Request"),
		dbus.WithMatchMember("Response"),
	); err != nil {
		return fmt.Errorf("listen for the portal's answer: %w", err)
	}

	var handle dbus.ObjectPath
	token := "systembridge" + strconv.FormatInt(time.Now().UnixNano(), 10)
	err = conn.Object(portalName, "/org/freedesktop/portal/desktop").CallWithContext(ctx,
		"org.freedesktop.portal.Screenshot.Screenshot", 0, "", map[string]dbus.Variant{
			"interactive":  dbus.MakeVariant(false),
			"handle_token": dbus.MakeVariant(token),
		}).Store(&handle)
	if err != nil {
		return fmt.Errorf("ask the desktop portal for a screenshot: %w", err)
	}

	for {
		select {
		case <-ctx.Done():
			return ctx.Err()
		case signal := <-signals:
			if signal.Path != handle || len(signal.Body) < 2 {
				continue
			}
			if code, _ := signal.Body[0].(uint32); code != 0 {
				return fmt.Errorf("the desktop portal didn't take the screenshot (response %d)", code)
			}
			results, _ := signal.Body[1].(map[string]dbus.Variant)
			uri, _ := results["uri"].Value().(string)
			return moveFromURI(uri, arguments[0])
		}
	}
}

// moveFromURI moves the portal's file to path. It copies rather than renames,
// as the portal often saves to another file system.
func moveFromURI(uri string, path string) error {
	parsed, err := url.Parse(uri)
	if err != nil || parsed.Scheme != "file" {
		return fmt.Errorf("the desktop portal returned %q, not a file", uri)
	}

	source, err := os.Open(parsed.Path)
	if err != nil {
		return fmt.Errorf("open the portal's screenshot: %w", err)
	}
	defer func() { _ = source.Close() }()

	target, err := os.Create(path)
	if err != nil {
		return fmt.Errorf("create %s: %w", path, err)
	}
	if _, err := io.Copy(target, source); err != nil {
		_ = target.Close()
		return fmt.Errorf("save the screenshot: %w", err)
	}
	if err := target.Close(); err != nil {
		return fmt.Errorf("save the screenshot: %w", err)
	}
	_ = os.Remove(parsed.Path)
	return nil
}
