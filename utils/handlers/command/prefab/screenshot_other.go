//go:build !windows && !linux

package prefab

// Other platforms capture with a program, so they have no built-in
var (
	screenshotBuiltin       Builtin
	screenshotBuiltinWhen   func() bool
	screenshotWindowBuiltin Builtin
)
