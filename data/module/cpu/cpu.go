package cpu

// getCPUPower returns the CPU power consumption in watts
func GetCPUPower() (float64, error) {
	return getCPUPower()
}

func GetCPUPowerPerCPU(id int) (float64, error) {
	return getCPUPowerPerCPU(id)
}
