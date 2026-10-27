//go:build linux

package cpu

import (
	"fmt"
	"os"
	"path/filepath"
	"slices"
	"strconv"
	"strings"
	"time"

	"github.com/timmo001/system-bridge/types"
)

// FreqBoundsPerCPU reads each CPU's hardware clock limits from sysfs.
func FreqBoundsPerCPU(count int) []FreqBounds {
	out := make([]FreqBounds, count)
	for i := range out {
		out[i] = readFreqBounds(i)
	}
	return out
}

func readFreqBounds(cpuIndex int) FreqBounds {
	base := "/sys/devices/system/cpu"
	cpuDir := filepath.Join(base, fmt.Sprintf("cpu%d", cpuIndex), "cpufreq")
	if _, err := os.Stat(cpuDir); err != nil {
		return FreqBounds{}
	}
	readMHz := func(path string) *float64 {
		b, err := os.ReadFile(path)
		if err != nil {
			return nil
		}
		s := strings.TrimSpace(string(b))
		if s == "" {
			return nil
		}
		v, err := strconv.ParseFloat(s, 64)
		if err != nil {
			return nil
		}
		mhz := v / 1000.0
		return &mhz
	}
	return FreqBounds{
		Min: readMHz(filepath.Join(cpuDir, "cpuinfo_min_freq")),
		Max: readMHz(filepath.Join(cpuDir, "cpuinfo_max_freq")),
	}
}

func ReadCPUStats() *types.CPUStats {
	const procStat = "/proc/stat"
	b, err := os.ReadFile(procStat)
	if err != nil || len(b) == 0 {
		return nil
	}
	var (
		ctxSwitches    *int64
		interrupts     *int64
		softInterrupts *int64
		syscalls       *int64
	)
	lines := strings.Split(string(b), "\n")
	for _, line := range lines {
		fields := strings.Fields(line)
		if len(fields) < 2 {
			continue
		}
		switch fields[0] {
		case "ctxt":
			if v, err := strconv.ParseInt(fields[1], 10, 64); err == nil {
				ctxSwitches = &v
			}
		case "intr":
			if v, err := strconv.ParseInt(fields[1], 10, 64); err == nil {
				interrupts = &v
			}
		case "softirq":
			if v, err := strconv.ParseInt(fields[1], 10, 64); err == nil {
				softInterrupts = &v
			}
		case "syscalls":
			if v, err := strconv.ParseInt(fields[1], 10, 64); err == nil {
				syscalls = &v
			}
		}
	}
	if ctxSwitches == nil && interrupts == nil && softInterrupts == nil && syscalls == nil {
		return nil
	}
	return &types.CPUStats{
		CtxSwitches:    ctxSwitches,
		Interrupts:     interrupts,
		SoftInterrupts: softInterrupts,
		Syscalls:       syscalls,
	}
}

func ComputeCPUPower(sample time.Duration) *float64 {
	// 1) Try Linux powercap (Intel & AMD) by scanning any powercap domains with energy_uj
	if w := computePowercapPower(sample); w != nil {
		return w
	}
	// 2) Try hwmon instantaneous power in microwatts
	if w := computeHwmonInstantPower(); w != nil {
		return w
	}
	// 3) Try hwmon energy sampling (energy*_input, microjoules)
	if w := computeHwmonEnergy(sample); w != nil {
		return w
	}
	return nil
}

// computePowercapPower samples any package-level powercap energy_uj counters.
func computePowercapPower(sample time.Duration) *float64 {
	capDirs, err := filepath.Glob("/sys/class/powercap/*")
	if err != nil || len(capDirs) == 0 {
		return nil
	}
	type domain struct{ energyPath string }
	domains := make([]domain, 0)
	for _, dir := range capDirs {
		// Only consider top-level rapl-like domains (exclude :subzones if needed; energy_uj existence filters sufficiently)
		nameB, _ := os.ReadFile(filepath.Join(dir, "name"))
		name := strings.TrimSpace(string(nameB))
		energyPath := filepath.Join(dir, "energy_uj")
		if _, err := os.Stat(energyPath); err == nil {
			// Prefer package-level domains (common across Intel+AMD)
			if name == "" || strings.Contains(strings.ToLower(name), "package") {
				domains = append(domains, domain{energyPath: energyPath})
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
	return &watts
}

// computeHwmonInstantPower reads power*_{input,average} from hwmon and returns Watts.
func computeHwmonInstantPower() *float64 {
	hwmons, err := filepath.Glob("/sys/class/hwmon/hwmon*")
	if err != nil || len(hwmons) == 0 {
		return nil
	}
	// Check common file names in order of desirability
	powerFiles := []string{"power1_average", "power1_input", "power_average", "power_input"}
	for _, hm := range hwmons {
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
				// Values are typically in microwatts
				w := v / 1_000_000.0
				return &w
			}
		}
	}
	return nil
}

// computeHwmonEnergy samples energy*_input (microjoules) from hwmon and returns Watts.
func computeHwmonEnergy(sample time.Duration) *float64 {
	hwmons, err := filepath.Glob("/sys/class/hwmon/hwmon*")
	if err != nil || len(hwmons) == 0 {
		return nil
	}
	energyFiles := make([]string, 0)
	for _, hm := range hwmons {
		// Common energy file naming pattern
		for i := 1; i <= 3; i++ {
			p := filepath.Join(hm, fmt.Sprintf("energy%d_input", i))
			if _, err := os.Stat(p); err == nil {
				energyFiles = append(energyFiles, p)
			}
		}
		// Fallback: a single energy_input
		p := filepath.Join(hm, "energy_input")
		if _, err := os.Stat(p); err == nil {
			energyFiles = append(energyFiles, p)
		}
	}
	if len(energyFiles) == 0 {
		return nil
	}
	readTotalEnergy := func(files []string) (float64, bool) {
		var totalUJ float64
		for _, f := range files {
			b, err := os.ReadFile(f)
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
	e1, ok1 := readTotalEnergy(energyFiles)
	if !ok1 {
		return nil
	}
	t1 := time.Now()
	time.Sleep(sample)
	e2, ok2 := readTotalEnergy(energyFiles)
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
	return &watts
}

// ReadCPUVcoreVoltage attempts to read CPU core voltage (Vcore) from hwmon.
// It looks for labels commonly used by AMD/Intel: vcore, vddcr_cpu, svi2_core.
// Returns volts if available.
func ReadCPUVcoreVoltage() *float64 {
	hwmons, err := filepath.Glob("/sys/class/hwmon/hwmon*")
	if err != nil || len(hwmons) == 0 {
		return nil
	}
	// Candidate labels to match (case-insensitive)
	candidates := []string{"vcore", "vddcr_cpu", "svi2_core", "cpu vcore"}
	for _, hm := range hwmons {
		// Try labeled inputs first: inX_label + inX_input
		entries, _ := os.ReadDir(hm)
		for _, e := range entries {
			name := e.Name()
			if strings.HasPrefix(name, "in") && strings.HasSuffix(name, "_label") {
				labelPath := filepath.Join(hm, name)
				b, err := os.ReadFile(labelPath)
				if err != nil {
					continue
				}
				label := strings.ToLower(strings.TrimSpace(string(b)))
				matched := false
				for _, c := range candidates {
					if strings.Contains(label, c) {
						matched = true
						break
					}
				}
				if !matched {
					continue
				}
				// Derive corresponding input path
				inputPath := strings.TrimSuffix(labelPath, "_label") + "_input"
				if v := readVoltageValue(inputPath); v != nil {
					return v
				}
			}
		}
	}
	return nil
}

// readVoltageValue reads an hwmon in*_input, which is in millivolts.
func readVoltageValue(path string) *float64 {
	b, err := os.ReadFile(path)
	if err != nil {
		return nil
	}
	millivolts, err := strconv.ParseFloat(strings.TrimSpace(string(b)), 64)
	if err != nil {
		return nil
	}
	volts := millivolts / 1000.0
	return &volts
}

// SampleDPC is Windows-only; there is no DPC accounting here.
func SampleDPC() DPCSample { return DPCSample{} }

// cpuHwmonNames are hwmon driver names that report the CPU itself.
var cpuHwmonNames = []string{"coretemp", "k10temp", "zenpower", "cpu_thermal"}

// ReadCPUTemperature attempts to read CPU temperature on Linux via hwmon
func ReadCPUTemperature() *float64 {
	return readCPUTemperature("/sys/class/hwmon")
}

// readCPUTemperature checks every hwmon device before falling back, so an
// unrelated sensor listed first (such as acpitz) can't win over the CPU's own.
// In order it prefers a package-style label on a CPU driver, any reading from a
// CPU driver, a package-style label anywhere, then the first temp1_input.
func readCPUTemperature(hwmonRoot string) *float64 {
	hwmons, err := filepath.Glob(filepath.Join(hwmonRoot, "hwmon*"))
	if err != nil || len(hwmons) == 0 {
		return nil
	}

	var cpuDriverLabelled, cpuDriverFirst, otherLabelled, firstInput string
	for _, hm := range hwmons {
		nameB, _ := os.ReadFile(filepath.Join(hm, "name"))
		isCPUDriver := slices.Contains(cpuHwmonNames, strings.TrimSpace(string(nameB)))
		labelled := findCPUTemperatureLabel(hm)
		first := filepath.Join(hm, "temp1_input")
		switch {
		case isCPUDriver && labelled != "" && cpuDriverLabelled == "":
			cpuDriverLabelled = labelled
		case isCPUDriver && cpuDriverFirst == "":
			cpuDriverFirst = first
		case labelled != "" && otherLabelled == "":
			otherLabelled = labelled
		}
		if firstInput == "" {
			if _, err := os.Stat(first); err == nil {
				firstInput = first
			}
		}
	}

	for _, candidate := range []string{cpuDriverLabelled, cpuDriverFirst, otherLabelled, firstInput} {
		if candidate == "" {
			continue
		}
		if b, err := os.ReadFile(candidate); err == nil {
			if v, err := strconv.ParseFloat(strings.TrimSpace(string(b)), 64); err == nil {
				// values typically in millidegrees C
				c := v / 1000.0
				return &c
			}
		}
	}
	return nil
}

// findCPUTemperatureLabel returns the input path of the first temp*_label in
// an hwmon device that names the package or CPU, such as "Package id 0" or
// "Tctl", or an empty string when there is none.
func findCPUTemperatureLabel(hwmonDir string) string {
	entries, _ := os.ReadDir(hwmonDir)
	for _, e := range entries {
		en := e.Name()
		if !strings.HasPrefix(en, "temp") || !strings.HasSuffix(en, "_label") {
			continue
		}
		lbPath := filepath.Join(hwmonDir, en)
		lb, err := os.ReadFile(lbPath)
		if err != nil {
			continue
		}
		lbl := strings.ToLower(strings.TrimSpace(string(lb)))
		if strings.Contains(lbl, "package") || strings.Contains(lbl, "cpu") || strings.Contains(lbl, "tctl") || strings.Contains(lbl, "tdie") {
			return strings.TrimSuffix(lbPath, "_label") + "_input"
		}
	}
	return ""
}
