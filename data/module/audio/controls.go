package audio

import "errors"

// ErrUnsupported is returned when audio can't be controlled on this platform
var ErrUnsupported = errors.New("audio control is not supported on this platform")

// ErrUnknownDevice is returned when no output or input has the given id
var ErrUnknownDevice = errors.New("no audio device with that id")
