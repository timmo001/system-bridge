// Package powercap reads power from the Linux powercap (RAPL) energy counters.
// The kernel makes energy_uj root-only by default, so every reading is
// best-effort and nil when the counter can't be read.
package powercap
