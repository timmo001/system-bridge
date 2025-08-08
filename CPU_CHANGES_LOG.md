# CPU Implementation Log

- Item: CPUFrequency Min/Max (overall and per-CPU)
  - Attempt: 1
  - Change: Populate min/max CPU frequency using Linux sysfs (/sys/devices/system/cpu/cpu\*/cpufreq/cpuinfo\_{min,max}\_freq) on a best-effort basis. Falls back gracefully when unavailable.
  - Files Edited: `data/module/cpu.go`
  - Status: Committed

- Item: CPUTimesPercent (overall and per-CPU) and CPUStats (ctxt, intr, softirq, syscalls)
  - Attempt: 1
  - Change: Compute times_percent via short sampling of cpu.Times deltas; parse /proc/stat for ctxt/intr/softirq/syscalls.
  - Files Edited: `data/module/cpu.go`
  - Status: Committed

- Item: Overall CPU Power (Linux)
  - Attempt: 2
  - Change: Add AMD-friendly detection. Try powercap energy_uj for any package domain; fallback to hwmon instantaneous power (microwatts) and hwmon energy sampling.
  - Files Edited: `data/module/cpu/cpu_linux.go`, `data/module/cpu.go`
  - Status: Committed (may still be null on some systems)

- Item: Overall CPU Voltage (Vcore)
  - Attempt: 1
  - Change: Linux: read Vcore via hwmon labels/inputs (vcore/vddcr_cpu/svi2_core). macOS: parse powermetrics SMC sampler for CPU Vcore. Windows: returns nil for now (no WMI dep).
  - Files Edited: `data/module/cpu/cpu_linux.go`, `data/module/cpu/cpu_darwin.go`, `data/module/cpu.go`
  - Status: Committed

- Item: Windows DPC Time Percent
  - Attempt: 1
  - Change: Query typeperf for % DPC Time (per-CPU and _Total) and wire to `types.CPUTimes.DPC` best-effort on Windows. Safe no-ops on Linux/macOS.
  - Files Edited: `data/module/cpu/cpu_windows.go`, `data/module/cpu.go`
  - Status: Committed (untested on Windows; best-effort with fallbacks)

- Item: Per-CPU Voltage Propagation
  - Attempt: 1
  - Change: Propagate overall Vcore to each per-CPU `voltage` field when available (best-effort).
  - Files Edited: `data/module/cpu.go`
  - Status: Committed

- Item: macOS Min/Max Frequency
  - Attempt: 1
  - Change: Best-effort via `sysctl` `hw.cpufrequency_min`/`hw.cpufrequency_max` (Hz to MHz).
  - Files Edited: `data/module/cpu/cpu_darwin.go`
  - Status: Committed

- Item: Windows Max Frequency and Vcore
  - Attempt: 1
  - Change: Best-effort per-CPU max via PowerShell `Win32_Processor.MaxClockSpeed`; Vcore via `Win32_Processor.CurrentVoltage` (decivolts). Min not available.
  - Files Edited: `data/module/cpu/cpu_windows.go`
  - Status: Committed

- Item: CPU Temperature Fallbacks (Linux/macOS/Windows)
  - Attempt: 1
  - Change: Linux: hwmon temp*_input (package/cpu/tctl/tdie) to Celsius; macOS: powermetrics SMC (CPU die temperature); Windows: `MSAcpi_ThermalZoneTemperature` via PowerShell (K/10 to C). Used as fallback when gopsutil sensors does not provide a CPU temp.
  - Files Edited: `data/module/cpu/cpu_linux.go`, `data/module/cpu/cpu_darwin.go`, `data/module/cpu/cpu_windows.go`, `data/module/cpu.go`
  - Status: Committed

- Item: Windows Overall CPU Power
  - Attempt: 1
  - Change: Best-effort via Windows Power Meter performance counters using `typeperf` to read `\\Power Meter(*)\\Power` and sum instances.
  - Files Edited: `data/module/cpu/cpu_windows.go`
  - Status: Committed (may be unavailable on some systems)

- Item: Per-CPU Power Distribution
  - Attempt: 1
  - Change: Weight overall package power by per-CPU usage percentages to estimate per-core power; fallback to equal distribution.
  - Files Edited: `data/module/cpu.go`
  - Status: Committed

- Item: Windows CPU Stats (best-effort)
  - Attempt: 1
  - Change: Populate `CPUStats` using `typeperf` counters: `\\System\\Context Switches/sec`, `\\Processor(_Total)\\Interrupts/sec`, and `\\System\\System Calls/sec` (approximate per-second values as counts).
  - Files Edited: `data/module/cpu/cpu_windows.go`
  - Status: Committed (approximation; may be unavailable)

- Item: Types cleanup for CPU
  - Attempt: 1
  - Change: Remove TODO comments for implemented fields: `CPUFrequency.Min/Max`, `CPUData.Power/Stats/TimesPercent/Voltage`, `PerCPU.Power/TimesPercent`, `CPUTimes.DPC` tag.
  - Files Edited: `types/cpu.go`
  - Status: Committed

- Item: Windows DPC Time Absolute
  - Attempt: 1
  - Change: Add `GetDPCTimeSeconds` to compute absolute DPC time via sampling `% DPC Time` with `typeperf` for per-CPU and overall; wire into `data/module/cpu.go`.
  - Files Edited: `data/module/cpu/cpu_windows.go`, `data/module/cpu.go`, `data/module/cpu/cpu_linux.go`, `data/module/cpu/cpu_darwin.go`
  - Status: Committed
