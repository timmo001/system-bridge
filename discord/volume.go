package discord

import "math"

// The RPC API reports volume as an amplitude. Discord's sliders show a
// perceptual percentage. Up to 100% the slider follows a power curve; the
// exponent is measured against the Discord client. Above 100%, the output
// slider adds up to 6 dB of boost, the same as github.com/discord/perceptual.
const (
	sliderExponent = 2.8
	boostRangeDB   = 6
)

// sliderToAmplitude converts a Discord slider percentage to an RPC volume.
func sliderToAmplitude(slider float64) float64 {
	if slider <= 0 {
		return 0
	}
	if slider > 100 {
		db := (slider - 100) / 100 * boostRangeDB
		return 100 * math.Pow(10, db/20)
	}
	return 100 * math.Pow(slider/100, sliderExponent)
}

// amplitudeToSlider converts an RPC volume to the percentage that Discord's
// slider shows, rounded to a whole percent like the slider.
func amplitudeToSlider(amplitude float64) float64 {
	if amplitude <= 0 {
		return 0
	}
	var slider float64
	if amplitude > 100 {
		db := 20 * math.Log10(amplitude/100)
		slider = 100 + db/boostRangeDB*100
	} else {
		slider = 100 * math.Pow(amplitude/100, 1/sliderExponent)
	}
	return math.Round(slider)
}
