//go:build linux
// +build linux

package memory

import (
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"log/slog"

	"github.com/timmo001/system-bridge/types"
)

// GetMemoryPower attempts to read memory power consumption from various Linux sources
func GetMemoryPower(sample time.Duration) *types.MemoryPower {
	// Try powercap memory domains first (Intel/AMD)
	if power := getPowercapMemoryPower(sample); power != nil {
		return power
	}

	// Try hwmon memory power sensors
	if power := getHwmonMemoryPower(); power != nil {
		return power
	}

	// Try estimated power based on memory usage and frequency
	if power := getEstimatedMemoryPower(); power != nil {
		return power
	}

	return nil
}

// getPowercapMemoryPower reads memory power from powercap domains
func getPowercapMemoryPower(sample time.Duration) *types.MemoryPower {
	capDirs, err := filepath.Glob("/sys/class/powercap/*")
	if err != nil || len(capDirs) == 0 {
		return nil
	}

	type memoryDomain struct {
		energyPath string
		name       string
		id         int
	}

	domains := make([]memoryDomain, 0)
	for _, dir := range capDirs {
		nameB, _ := os.ReadFile(filepath.Join(dir, "name"))
		name := strings.TrimSpace(string(nameB))
		energyPath := filepath.Join(dir, "energy_uj")

		if _, err := os.Stat(energyPath); err == nil {
			// Look for memory-related domains
			nameLower := strings.ToLower(name)
			if strings.Contains(nameLower, "dram") || 
			   strings.Contains(nameLower, "memory") || 
			   strings.Contains(nameLower, "ram") {
				// Extract domain ID from path
				id := extractDomainID(dir)
				domains = append(domains, memoryDomain{
					energyPath: energyPath,
					name:       name,
					id:         id,
				})
			}
		}
	}

	if len(domains) == 0 {
		return nil
	}

	readTotalEnergy := func() (float64, bool) {
		var totalUJ float64
		for _, d := range domains {
			b, err := os.ReadFile(d.energyPath)
			if err != nil {
				return 0, false
			}
			s := strings.TrimSpace(string(b))
			v, err := strconv.ParseFloat(s, 64)
			if err != nil {
				return 0, false
			}
			totalUJ += v
		}
		return totalUJ, true
	}

	e1, ok1 := readTotalEnergy()
	if !ok1 {
		return nil
	}
	t1 := time.Now()
	time.Sleep(sample)
	e2, ok2 := readTotalEnergy()
	if !ok2 {
		return nil
	}
	dt := time.Since(t1).Seconds()
	if dt <= 0 {
		return nil
	}
	deltaJ := (e2 - e1) / 1_000_000.0
	if deltaJ < 0 {
		return nil
	}
	watts := deltaJ / dt

	// Create per-module power data
	perModule := make([]types.MemoryModulePower, len(domains))
	for i, d := range domains {
		// Estimate per-module power based on total power and number of modules
		modulePower := watts / float64(len(domains))
		perModule[i] = types.MemoryModulePower{
			ID:    d.id,
			Power: &modulePower,
		}
	}

	return &types.MemoryPower{
		Total:     &watts,
		PerModule: perModule,
	}
}

// getHwmonMemoryPower reads memory power from hwmon sensors
func getHwmonMemoryPower() *types.MemoryPower {
	hwmons, err := filepath.Glob("/sys/class/hwmon/hwmon*")
	if err != nil || len(hwmons) == 0 {
		return nil
	}

	var totalPower float64
	perModule := make([]types.MemoryModulePower, 0)

	for _, hm := range hwmons {
		// Check if this hwmon device is memory-related
		nameFile := filepath.Join(hm, "name")
		nameData, err := os.ReadFile(nameFile)
		if err != nil {
			continue
		}
		name := strings.ToLower(strings.TrimSpace(string(nameData)))

		if !strings.Contains(name, "memory") && 
		   !strings.Contains(name, "dram") && 
		   !strings.Contains(name, "ram") {
			continue
		}

		// Look for power sensors
		powerFiles := []string{"power1_input", "power1_average", "power_input", "power_average"}
		for _, fname := range powerFiles {
			p := filepath.Join(hm, fname)
			if _, err := os.Stat(p); err == nil {
				b, err := os.ReadFile(p)
				if err != nil {
					continue
				}
				s := strings.TrimSpace(string(b))
				v, err := strconv.ParseFloat(s, 64)
				if err != nil {
					continue
				}
				// Convert from microwatts to watts
				power := v / 1_000_000.0
				totalPower += power

				// Extract module ID from hwmon path
				moduleID := extractHwmonModuleID(hm)
				perModule = append(perModule, types.MemoryModulePower{
					ID:    moduleID,
					Power: &power,
				})
				break
			}
		}
	}

	if totalPower == 0 {
		return nil
	}

	return &types.MemoryPower{
		Total:     &totalPower,
		PerModule: perModule,
	}
}

// getEstimatedMemoryPower provides a rough estimate based on memory usage and frequency
func getEstimatedMemoryPower() *types.MemoryPower {
	// This is a simplified estimation - in reality, memory power depends on many factors
	// like frequency, voltage, usage patterns, etc.
	
	// Read memory info from /proc/meminfo
	memInfo, err := os.ReadFile("/proc/meminfo")
	if err != nil {
		return nil
	}

	var totalMemKB uint64
	lines := strings.Split(string(memInfo), "\n")
	for _, line := range lines {
		if strings.HasPrefix(line, "MemTotal:") {
			fields := strings.Fields(line)
			if len(fields) >= 2 {
				if val, err := strconv.ParseUint(fields[1], 10, 64); err == nil {
					totalMemKB = val
					break
				}
			}
		}
	}

	if totalMemKB == 0 {
		return nil
	}

	// Rough estimation: DDR4/DDR5 typically consumes 2-5W per 8GB
	// This is a very rough estimate and should be replaced with actual measurements
	totalMemGB := float64(totalMemKB) / (1024 * 1024)
	estimatedPower := totalMemGB * 0.5 // 0.5W per GB as a rough estimate

	// Create a single "module" representing all memory
	perModule := []types.MemoryModulePower{
		{
			ID:    0,
			Power: &estimatedPower,
		},
	}

	slog.Debug("Using estimated memory power", "total_gb", totalMemGB, "estimated_watts", estimatedPower)

	return &types.MemoryPower{
		Total:     &estimatedPower,
		PerModule: perModule,
	}
}

// extractDomainID extracts domain ID from powercap directory path
func extractDomainID(dir string) int {
	// Extract ID from path like /sys/class/powercap/intel-rapl:0:1
	parts := strings.Split(dir, ":")
	if len(parts) > 1 {
		if id, err := strconv.Atoi(parts[len(parts)-1]); err == nil {
			return id
		}
	}
	return 0
}

// extractHwmonModuleID extracts module ID from hwmon directory path
func extractHwmonModuleID(dir string) int {
	// Extract ID from path like /sys/class/hwmon/hwmon1
	parts := strings.Split(dir, "/")
	if len(parts) > 0 {
		lastPart := parts[len(parts)-1]
		if strings.HasPrefix(lastPart, "hwmon") {
			if id, err := strconv.Atoi(strings.TrimPrefix(lastPart, "hwmon")); err == nil {
				return id
			}
		}
	}
	return 0
}