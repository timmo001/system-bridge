package utils

import "math"

// Round2 rounds a computed reading to 2 decimal places, so clients get the
// value rather than the noise of the division that produced it
func Round2(v float64) float64 {
	return math.Round(v*100) / 100
}
