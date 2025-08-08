# Tasks

## CPU Items (from 5.x.x Rebuild TODOs)

Source: [Issue #3475](https://github.com/timmo001/system-bridge/issues/3475)

- [x] Windows: CPU min frequency (per-CPU); compute overall min from per-CPU
- [x] Windows/macOS: overall CPU power (best-effort platform implementations)
- [x] Windows: DPC time (absolute) per-CPU and overall (we currently expose DPC percent)
- [x] Linux/macOS/Windows: true per-CPU power (not equal distribution)
- [ ] Linux/macOS/Windows: true per-CPU voltage (not propagated overall Vcore)
- [x] Windows/macOS: CPU statistics (CtxSwitches, Interrupts, SoftInterrupts, Syscalls)
- [ ] Validate TimesPercent correctness across OSes; remove related TODOs
- [x] Types cleanup: remove TODOs once fully implemented across OSes

### Types (`types/cpu.go`) TODO alignment

- [x] `CPUFrequency.Min`: implement minimum frequency detection across OSes
- [x] `CPUFrequency.Max`: implement maximum frequency detection across OSes
- [x] `CPUStats`: implement population across OSes
- [ ] `CPUTimes.DPC`: implement Deferred Procedure Call time tracking (absolute)
- [x] `PerCPU.Power`: implement per-CPU power consumption monitoring
- [x] `PerCPU.TimesPercent`: ensure correctness; remove TODO
- [ ] `PerCPU.Voltage`: implement per-CPU voltage monitoring
- [x] `CPUData.Power`: implement overall CPU power consumption monitoring across OSes
- [x] `CPUData.Stats`: implement overall CPU statistics collection
- [x] `CPUData.TimesPercent`: ensure correctness; remove TODO
- [x] `CPUData.Voltage`: implement overall CPU voltage monitoring across OSes

### Notes

- Keep logging progress in `CPU_CHANGES_LOG.md`
- Test each change with: `go run . client data run --module cpu`
- Commit after each working item with concise messages
