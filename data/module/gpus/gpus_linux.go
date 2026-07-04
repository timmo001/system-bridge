//go:build linux

package gpus

import (
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"regexp"
	"sort"
	"strconv"
	"strings"
	"time"

	"log/slog"

	"github.com/timmo001/system-bridge/types"
)

// PCI vendor IDs for GPU vendors.
const (
	pciVendorIntel  = 0x8086
	pciVendorAMD    = 0x1002
	pciVendorNVIDIA = 0x10de
)

// cardNameRegex matches a primary DRM card node (e.g. "card0") while excluding
// connector nodes such as "card0-DP-1" or "card0-eDP-1".
var cardNameRegex = regexp.MustCompile(`^card[0-9]+$`)

func getGPUs() ([]types.GPU, error) {
	gpuList := make([]types.GPU, 0)

	// 1) NVIDIA via nvidia-smi (richest data when the proprietary tools exist).
	gpuList = append(gpuList, getNVIDIAGPUs()...)

	// 2) Intel (xe / i915) and AMD (amdgpu) via the DRM sysfs interfaces. This is
	//    the primary path for Intel Arc and integrated Intel/AMD graphics. When
	//    nvidia-smi already reported GPUs, skip NVIDIA-vendor DRM nodes to avoid
	//    double-counting the same card.
	gpuList = append(gpuList, getDRMGPUs(len(gpuList) > 0)...)

	// 3) Last-resort fallback: if nothing was detected, surface at least the GPU
	//    name(s) from lspci so the module is never silently empty.
	if len(gpuList) == 0 {
		gpuList = append(gpuList, getLspciGPUs()...)
	}

	return gpuList, nil
}

// getNVIDIAGPUs queries nvidia-smi for full metrics. Returns an empty slice when
// nvidia-smi is unavailable (non-NVIDIA systems or missing driver tools).
func getNVIDIAGPUs() []types.GPU {
	gpuList := make([]types.GPU, 0)

	cmd := exec.Command("nvidia-smi", "--query-gpu=gpu_name,memory.total,memory.used,memory.free,utilization.gpu,clocks.current.graphics,clocks.current.memory,power.draw,temperature.gpu", "--format=csv,noheader,nounits")
	output, err := cmd.Output()
	if err != nil {
		return gpuList
	}

	lines := strings.Split(string(output), "\n")
	for _, line := range lines {
		fields := strings.Split(line, ",")
		if len(fields) < 9 {
			continue
		}
		name := strings.TrimSpace(fields[0])
		memoryTotal, _ := strconv.ParseFloat(strings.TrimSpace(fields[1]), 64)
		memoryUsed, _ := strconv.ParseFloat(strings.TrimSpace(fields[2]), 64)
		memoryFree, _ := strconv.ParseFloat(strings.TrimSpace(fields[3]), 64)
		coreLoad, _ := strconv.ParseFloat(strings.TrimSpace(fields[4]), 64)
		coreClock, _ := strconv.ParseFloat(strings.TrimSpace(fields[5]), 64)
		memoryClock, _ := strconv.ParseFloat(strings.TrimSpace(fields[6]), 64)
		powerUsage, _ := strconv.ParseFloat(strings.TrimSpace(fields[7]), 64)
		temperature, _ := strconv.ParseFloat(strings.TrimSpace(fields[8]), 64)

		memoryLoad := 0.0
		if memoryTotal > 0 {
			memoryLoad = (memoryUsed / memoryTotal) * 100.0
		}

		gpuList = append(gpuList, types.GPU{
			ID:          fmt.Sprintf("nvidia-%d", len(gpuList)),
			Name:        name,
			CoreClock:   &coreClock,
			CoreLoad:    &coreLoad,
			MemoryClock: &memoryClock,
			MemoryLoad:  &memoryLoad,
			MemoryFree:  &memoryFree,
			MemoryUsed:  &memoryUsed,
			MemoryTotal: &memoryTotal,
			PowerUsage:  &powerUsage,
			Temperature: &temperature,
		})
	}

	return gpuList
}

// getDRMGPUs enumerates real PCI GPUs exposed under /sys/class/drm and reads
// best-effort metrics (core clock, load, temperature, power, memory) from the
// kernel driver's sysfs interfaces. It covers Intel (xe/i915) and AMD (amdgpu).
// When skipNVIDIA is true, NVIDIA-vendor cards are ignored because nvidia-smi
// already reported them.
func getDRMGPUs(skipNVIDIA bool) []types.GPU {
	gpuList := make([]types.GPU, 0)

	cards, err := filepath.Glob("/sys/class/drm/card[0-9]*")
	if err != nil {
		slog.Debug("Failed to glob DRM cards", "error", err)
		return gpuList
	}
	sort.Strings(cards)

	// Best-effort PCI address -> human readable name map from lspci.
	pciNames := lspciNameMap()

	for _, cardPath := range cards {
		base := filepath.Base(cardPath)
		if !cardNameRegex.MatchString(base) {
			continue
		}

		devPath := filepath.Join(cardPath, "device")

		// Require a readable PCI vendor to filter out virtual DRM nodes such as
		// simpledrm/efifb/vkms which are not real GPUs.
		vendor, ok := readSysHex(filepath.Join(devPath, "vendor"))
		if !ok {
			continue
		}
		if skipNVIDIA && vendor == pciVendorNVIDIA {
			continue
		}

		driver := readDriverName(devPath)
		pciAddr := pciAddressFromDevice(devPath)

		name := ""
		if pciAddr != "" {
			if n, found := pciNames[pciAddr]; found {
				name = n
			} else if n, found := pciNames[strings.TrimPrefix(pciAddr, "0000:")]; found {
				name = n
			}
		}
		if name == "" {
			deviceID, _ := readSysString(filepath.Join(devPath, "device"))
			name = gpuFallbackName(vendor, deviceID, driver)
		}

		gpu := types.GPU{
			ID:   base,
			Name: name,
		}

		if v := readGPUCoreClock(devPath); v != nil {
			gpu.CoreClock = v
		}
		if v := readGPULoad(devPath); v != nil {
			gpu.CoreLoad = v
		}
		if temp, power := readGPUHwmon(devPath); temp != nil || power != nil {
			if temp != nil {
				gpu.Temperature = temp
			}
			if power != nil {
				gpu.PowerUsage = power
			}
		}
		if total, used := readGPUMemory(devPath); total != nil {
			gpu.MemoryTotal = total
			if used != nil {
				gpu.MemoryUsed = used
				free := *total - *used
				gpu.MemoryFree = &free
				if *total > 0 {
					load := (*used / *total) * 100.0
					gpu.MemoryLoad = &load
				}
			}
		}

		gpuList = append(gpuList, gpu)
	}

	return gpuList
}

// getLspciGPUs returns GPU names parsed from `lspci`. Used only as a last resort
// when no driver-level metrics are available.
func getLspciGPUs() []types.GPU {
	gpuList := make([]types.GPU, 0)

	cmd := exec.Command("lspci", "-D")
	output, err := cmd.Output()
	if err != nil {
		slog.Debug("lspci not available for GPU fallback", "error", err)
		return gpuList
	}

	for _, line := range strings.Split(string(output), "\n") {
		line = strings.TrimSpace(line)
		if line == "" {
			continue
		}
		// Match display-class devices (VGA, 3D, Display controllers).
		lower := strings.ToLower(line)
		if !strings.Contains(lower, "vga compatible controller") &&
			!strings.Contains(lower, "3d controller") &&
			!strings.Contains(lower, "display controller") {
			continue
		}
		// Format: "<address> <class>: <name> (rev NN)".
		addrSplit := strings.SplitN(line, " ", 2)
		if len(addrSplit) != 2 {
			continue
		}
		classIdx := strings.Index(addrSplit[1], ": ")
		if classIdx < 0 {
			continue
		}
		name := strings.TrimSpace(addrSplit[1][classIdx+2:])
		if rev := strings.LastIndex(name, " (rev "); rev >= 0 {
			name = strings.TrimSpace(name[:rev])
		}
		if name == "" {
			continue
		}
		gpuList = append(gpuList, types.GPU{
			ID:   fmt.Sprintf("gpu-%d", len(gpuList)),
			Name: name,
		})
	}

	return gpuList
}

// readGPUCoreClock returns the current GPU core (render) clock in MHz. It prefers
// the actual clock and falls back to the requested clock, covering the xe driver
// (tile*/gt*/freq0), the modern i915 layout (gt/gt*), and legacy i915 files.
func readGPUCoreClock(devPath string) *float64 {
	type freqPair struct{ act, cur string }
	pairs := make([]freqPair, 0)

	// xe driver: tile0/gt0 is the primary render/compute GT.
	for _, gt := range globSorted(filepath.Join(devPath, "tile*", "gt*", "freq0")) {
		pairs = append(pairs, freqPair{filepath.Join(gt, "act_freq"), filepath.Join(gt, "cur_freq")})
	}
	// Modern multi-tile i915 layout.
	for _, gt := range globSorted(filepath.Join(devPath, "gt", "gt*")) {
		pairs = append(pairs, freqPair{filepath.Join(gt, "rps_act_freq_mhz"), filepath.Join(gt, "rps_cur_freq_mhz")})
	}
	// Legacy single-GT i915 layout.
	pairs = append(pairs, freqPair{filepath.Join(devPath, "gt_act_freq_mhz"), filepath.Join(devPath, "gt_cur_freq_mhz")})

	for _, p := range pairs {
		act := readSysFloat(p.act)
		cur := readSysFloat(p.cur)
		// Prefer a non-zero actual clock; when gated to 0 report the requested
		// clock as a more useful "current" value.
		if act != nil && *act > 0 {
			return act
		}
		if cur != nil {
			return cur
		}
		if act != nil {
			return act
		}
	}
	return nil
}

// readGPULoad returns GPU busy percentage (0-100) best-effort. amdgpu exposes an
// instantaneous value; the xe driver requires sampling idle residency.
func readGPULoad(devPath string) *float64 {
	// amdgpu and some other drivers expose an instant busy percentage.
	if v := readSysFloat(filepath.Join(devPath, "gpu_busy_percent")); v != nil {
		return clampPercent(*v)
	}
	// xe driver: derive busy% from the render GT idle residency delta.
	if v := readXeBusyPercent(devPath); v != nil {
		return v
	}
	return nil
}

// readXeBusyPercent samples the first GT's idle residency over a short interval
// and converts it to a busy percentage.
func readXeBusyPercent(devPath string) *float64 {
	gtidles := globSorted(filepath.Join(devPath, "tile*", "gt*", "gtidle"))
	if len(gtidles) == 0 {
		return nil
	}
	idlePath := filepath.Join(gtidles[0], "idle_residency_ms")
	first := readSysFloat(idlePath)
	if first == nil {
		return nil
	}
	start := time.Now()
	time.Sleep(150 * time.Millisecond)
	second := readSysFloat(idlePath)
	if second == nil {
		return nil
	}
	elapsed := float64(time.Since(start).Milliseconds())
	if elapsed <= 0 {
		return nil
	}
	idleDelta := *second - *first
	if idleDelta < 0 {
		idleDelta = 0
	}
	busy := (1.0 - idleDelta/elapsed) * 100.0
	return clampPercent(busy)
}

// readGPUHwmon reads temperature (Celsius) and power (Watts) from any hwmon
// device attached under the GPU's DRM device. Discrete Intel Arc and AMD cards
// expose these; integrated GPUs typically do not.
func readGPUHwmon(devPath string) (temp *float64, power *float64) {
	hwmons, err := filepath.Glob(filepath.Join(devPath, "hwmon", "hwmon*"))
	if err != nil {
		return nil, nil
	}
	sort.Strings(hwmons)
	for _, h := range hwmons {
		if temp == nil {
			temp = readHwmonGPUTemp(h)
		}
		if power == nil {
			if p := readSysFloat(filepath.Join(h, "power1_input")); p != nil {
				watts := *p / 1_000_000.0
				power = &watts
			}
		}
	}
	return temp, power
}

// readHwmonGPUTemp prefers a labelled GPU/edge/junction temperature and falls
// back to temp1_input. Values are in milli-degrees Celsius.
func readHwmonGPUTemp(hwmonDir string) *float64 {
	labels, _ := filepath.Glob(filepath.Join(hwmonDir, "temp*_label"))
	sort.Strings(labels)
	for _, labelPath := range labels {
		label, ok := readSysString(labelPath)
		if !ok {
			continue
		}
		lower := strings.ToLower(label)
		if strings.Contains(lower, "gpu") || strings.Contains(lower, "edge") ||
			strings.Contains(lower, "junction") || strings.Contains(lower, "mem") {
			inputPath := strings.TrimSuffix(labelPath, "_label") + "_input"
			if v := readSysFloat(inputPath); v != nil {
				c := *v / 1000.0
				return &c
			}
		}
	}
	if v := readSysFloat(filepath.Join(hwmonDir, "temp1_input")); v != nil {
		c := *v / 1000.0
		return &c
	}
	return nil
}

// readGPUMemory reads total and used dedicated video memory in megabytes.
// Currently supported via the amdgpu mem_info sysfs interface. Returns nil for
// GPUs without dedicated VRAM sysfs (e.g. integrated Intel).
func readGPUMemory(devPath string) (total *float64, used *float64) {
	const bytesPerMB = 1024.0 * 1024.0
	if v := readSysFloat(filepath.Join(devPath, "mem_info_vram_total")); v != nil {
		mb := *v / bytesPerMB
		total = &mb
	}
	if v := readSysFloat(filepath.Join(devPath, "mem_info_vram_used")); v != nil {
		mb := *v / bytesPerMB
		used = &mb
	}
	return total, used
}

// lspciNameMap builds a map of PCI address -> human readable device name from
// `lspci -D`. Both full ("0000:00:02.0") and short ("00:02.0") forms are keyed.
func lspciNameMap() map[string]string {
	names := make(map[string]string)

	cmd := exec.Command("lspci", "-D")
	output, err := cmd.Output()
	if err != nil {
		return names
	}

	for _, line := range strings.Split(string(output), "\n") {
		line = strings.TrimSpace(line)
		if line == "" {
			continue
		}
		addrSplit := strings.SplitN(line, " ", 2)
		if len(addrSplit) != 2 {
			continue
		}
		addr := addrSplit[0]
		classIdx := strings.Index(addrSplit[1], ": ")
		if classIdx < 0 {
			continue
		}
		name := strings.TrimSpace(addrSplit[1][classIdx+2:])
		if rev := strings.LastIndex(name, " (rev "); rev >= 0 {
			name = strings.TrimSpace(name[:rev])
		}
		if name == "" {
			continue
		}
		names[addr] = name
		names[strings.TrimPrefix(addr, "0000:")] = name
	}

	return names
}

// gpuFallbackName constructs a name from PCI vendor, device ID, and driver when
// lspci is unavailable.
func gpuFallbackName(vendor uint64, deviceID, driver string) string {
	vendorName := ""
	switch vendor {
	case pciVendorIntel:
		vendorName = "Intel"
	case pciVendorAMD:
		vendorName = "AMD"
	case pciVendorNVIDIA:
		vendorName = "NVIDIA"
	}

	parts := make([]string, 0, 3)
	if vendorName != "" {
		parts = append(parts, vendorName)
	}
	parts = append(parts, "GPU")
	if driver != "" {
		parts = append(parts, fmt.Sprintf("(%s)", driver))
	} else if vendorName == "" && deviceID != "" {
		parts = append(parts, fmt.Sprintf("[%s]", deviceID))
	}
	return strings.Join(parts, " ")
}

// pciAddressFromDevice resolves the PCI address (e.g. "0000:00:02.0") for a DRM
// device symlink.
func pciAddressFromDevice(devPath string) string {
	real, err := filepath.EvalSymlinks(devPath)
	if err != nil {
		return ""
	}
	return filepath.Base(real)
}

// readDriverName resolves the kernel driver bound to a device (e.g. "xe",
// "i915", "amdgpu").
func readDriverName(devPath string) string {
	real, err := filepath.EvalSymlinks(filepath.Join(devPath, "driver"))
	if err != nil {
		return ""
	}
	return filepath.Base(real)
}

// readSysString reads a sysfs file and returns its trimmed string content.
func readSysString(path string) (string, bool) {
	data, err := os.ReadFile(path)
	if err != nil {
		return "", false
	}
	return strings.TrimSpace(string(data)), true
}

// readSysFloat reads a sysfs file containing a single numeric value.
func readSysFloat(path string) *float64 {
	s, ok := readSysString(path)
	if !ok {
		return nil
	}
	v, err := strconv.ParseFloat(s, 64)
	if err != nil {
		return nil
	}
	return &v
}

// readSysHex reads a sysfs file containing a hex value such as "0x8086".
func readSysHex(path string) (uint64, bool) {
	s, ok := readSysString(path)
	if !ok {
		return 0, false
	}
	s = strings.TrimPrefix(strings.ToLower(s), "0x")
	v, err := strconv.ParseUint(s, 16, 64)
	if err != nil {
		return 0, false
	}
	return v, true
}

// globSorted returns a lexically sorted list of matches for a glob pattern.
func globSorted(pattern string) []string {
	matches, err := filepath.Glob(pattern)
	if err != nil {
		return nil
	}
	sort.Strings(matches)
	return matches
}

// clampPercent constrains a value to the 0-100 range and returns a pointer.
func clampPercent(v float64) *float64 {
	if v < 0 {
		v = 0
	}
	if v > 100 {
		v = 100
	}
	return &v
}
