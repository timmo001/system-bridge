//go:build !linux

package networks

// linkStats isn't supported on this platform yet, so the speed is unknown.
func linkStats(name string) (speed *int, duplex string) {
	return nil, "unknown"
}
