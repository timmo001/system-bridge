package discord

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

// RPC volumes read from the Discord client with its slider at each position.
func TestAmplitudeToSliderMatchesDiscord(t *testing.T) {
	tests := []struct {
		amplitude float64
		slider    float64
	}{
		{0, 0},
		{2.0279526815673914, 25},
		{14.596480162478759, 50},
		{44.93177389837364, 75},
		{100, 100},
		{199.52623149688796, 200},
	}
	for _, tt := range tests {
		assert.Equal(t, tt.slider, amplitudeToSlider(tt.amplitude), "amplitude %v", tt.amplitude)
	}
}

func TestSliderRoundTrip(t *testing.T) {
	for slider := 0.0; slider <= 200; slider++ {
		assert.Equal(t, slider, amplitudeToSlider(sliderToAmplitude(slider)), "slider %v", slider)
	}
}
