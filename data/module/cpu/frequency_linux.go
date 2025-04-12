//go:build linux
// +build linux

package cpu

import (
	"fmt"
	"os"
	"path/filepath"
	"strconv"
	"strings"
)

// getCPUFrequencies returns the min, max, and current frequencies for a specific CPU
func getCPUFrequencies(cpuID int) (min, max, current float64, err error) {
	cpuPath := fmt.Sprintf("/sys/devices/system/cpu/cpu%d/cpufreq", cpuID)

	// Read min frequency
	minData, err := os.ReadFile(filepath.Join(cpuPath, "cpuinfo_min_freq"))
	if err != nil {
		return 0, 0, 0, fmt.Errorf("failed to read min frequency: %v", err)
	}
	min, err = strconv.ParseFloat(strings.TrimSpace(string(minData)), 64)
	if err != nil {
		return 0, 0, 0, fmt.Errorf("failed to parse min frequency: %v", err)
	}
	// Convert from KHz to MHz
	min = min / 1000.0

	// Read max frequency
	maxData, err := os.ReadFile(filepath.Join(cpuPath, "cpuinfo_max_freq"))
	if err != nil {
		return 0, 0, 0, fmt.Errorf("failed to read max frequency: %v", err)
	}
	max, err = strconv.ParseFloat(strings.TrimSpace(string(maxData)), 64)
	if err != nil {
		return 0, 0, 0, fmt.Errorf("failed to parse max frequency: %v", err)
	}
	// Convert from KHz to MHz
	max = max / 1000.0

	// Read current frequency
	curData, err := os.ReadFile(filepath.Join(cpuPath, "scaling_cur_freq"))
	if err != nil {
		return 0, 0, 0, fmt.Errorf("failed to read current frequency: %v", err)
	}
	current, err = strconv.ParseFloat(strings.TrimSpace(string(curData)), 64)
	if err != nil {
		return 0, 0, 0, fmt.Errorf("failed to parse current frequency: %v", err)
	}
	// Convert from KHz to MHz
	current = current / 1000.0

	return min, max, current, nil
}

// GetCPUFrequency returns the min, max, and current frequencies for CPU 0
func GetCPUFrequency() (min, max, current float64, err error) {
	return getCPUFrequencies(0)
}

// GetCPUFrequencyPerCPU returns the min, max, and current frequencies for a specific CPU
func GetCPUFrequencyPerCPU(id int) (min, max, current float64, err error) {
	return getCPUFrequencies(id)
}
