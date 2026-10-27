package audio

import "errors"

// ErrUnsupported is returned when audio can't be controlled on this platform
var ErrUnsupported = errors.New("audio control is not supported on this platform")

// ErrUnknownDevice is returned when no output, input or app has the given id
var ErrUnknownDevice = errors.New("no audio device with that id")

// ErrWrongKind is returned when the action doesn't apply to that kind of
// device, such as making an app the default
var ErrWrongKind = errors.New("that can't be done to this kind of audio device")
