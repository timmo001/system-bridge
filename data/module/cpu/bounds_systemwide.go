//go:build windows || darwin

package cpu

// repeatBounds returns the same bounds for every one of count CPUs, for
// platforms that only report system-wide limits.
func repeatBounds(count int, b FreqBounds) []FreqBounds {
	out := make([]FreqBounds, count)
	for i := range out {
		out[i] = b
	}
	return out
}
