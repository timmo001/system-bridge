package cameras

import "errors"

// ErrUnsupported is returned for an action this platform can't do
var ErrUnsupported = errors.New("not supported on this platform")

// ErrNotFound is returned when no camera, or no control on it, has the id
// asked for
var ErrNotFound = errors.New("no camera or control with that id")

// ErrInvalidValue is returned for a value a control can't take, or a control
// that can't be set
var ErrInvalidValue = errors.New("invalid value")
