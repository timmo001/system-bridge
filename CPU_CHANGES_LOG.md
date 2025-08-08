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
