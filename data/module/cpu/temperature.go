package cpu

// GetCPUTemperature returns the CPU temperature in degrees Celsius
func GetCPUTemperature() (float64, error) {
	return getCPUTemperature()
}
