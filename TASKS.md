# Tasks

## CPU Items (from 5.x.x Rebuild TODOs)

Source: [Issue #3475](https://github.com/timmo001/system-bridge/issues/3475)

- [ ] Windows: CPU min frequency (per-CPU); compute overall min from per-CPU
- [ ] Windows/macOS: overall CPU power (best-effort platform implementations)
- [ ] Windows: DPC time (absolute) per-CPU and overall (we currently expose DPC percent)
- [ ] Linux/macOS/Windows: true per-CPU power (not equal distribution)
- [ ] Linux/macOS/Windows: true per-CPU voltage (not propagated overall Vcore)
- [ ] Windows/macOS: CPU statistics (CtxSwitches, Interrupts, SoftInterrupts, Syscalls)
- [ ] Validate TimesPercent correctness across OSes; remove related TODOs
- [ ] Types cleanup: remove TODOs once fully implemented across OSes

### Types (`types/cpu.go`) TODO alignment
- [ ] `CPUFrequency.Min`: implement minimum frequency detection across OSes
- [ ] `CPUFrequency.Max`: implement maximum frequency detection across OSes
- [ ] `CPUStats`: implement population across OSes
- [ ] `CPUTimes.DPC`: implement Deferred Procedure Call time tracking (absolute)
- [ ] `PerCPU.Power`: implement per-CPU power consumption monitoring
- [ ] `PerCPU.TimesPercent`: ensure correctness; remove TODO
- [ ] `PerCPU.Voltage`: implement per-CPU voltage monitoring
- [ ] `CPUData.Power`: implement overall CPU power consumption monitoring across OSes
- [ ] `CPUData.Stats`: implement overall CPU statistics collection
- [ ] `CPUData.TimesPercent`: ensure correctness; remove TODO
- [ ] `CPUData.Voltage`: implement overall CPU voltage monitoring across OSes

### Notes
- Keep logging progress in `CPU_CHANGES_LOG.md`
- Test each change with: `go run . client data run --module cpu`
- Commit after each working item with concise messages
