//go:build !linux && !windows

package battery

// acConnected isn't supported on this platform yet
func acConnected() *bool {
	return nil
}
