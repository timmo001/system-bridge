//go:build !linux
// +build !linux

package data

// StartPlayerctlListener is a no-op on non-Linux platforms.
// TODO(Windows): Consider using GlobalSystemMediaTransportControlsSessionManager (GSMTC)
// from Windows.Media.Control to subscribe to session events:
// - CurrentSessionChanged
// - MediaPropertiesChanged
// - PlaybackInfoChanged
// This would allow push updates similar to MPRIS playerctl on Linux.
// See: https://learn.microsoft.com/windows/uwp/audio-video-camera/system-media-transport-controls
func StartPlayerctlListener(_ *DataStore) {}
