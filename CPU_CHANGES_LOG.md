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
