package desktop

import "errors"

// ErrUnsupported is returned for an action this desktop can't do
var ErrUnsupported = errors.New("not supported on this desktop")

// ErrNotFound is returned when the window, workspace, layout or shortcut an
// action names isn't on the desktop
var ErrNotFound = errors.New("not found on the desktop")

// WindowState is the states to set on a window. Nil leaves a state as it is.
type WindowState struct {
	Fullscreen *bool
	Maximised  *bool
	Minimised  *bool
}

// HyprlandWindowSettings is what to set on a Hyprland window. Nil leaves a
// setting as it is. The position and size are in pixels, each set as a pair.
type HyprlandWindowSettings struct {
	Floating *bool
	Pinned   *bool
	X        *int
	Y        *int
	Width    *int
	Height   *int
}
