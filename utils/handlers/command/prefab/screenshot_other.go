//go:build !windows

package prefab

// Other platforms capture with a program, so they have no built-in
var (
	screenshotBuiltin       Builtin
	screenshotWindowBuiltin Builtin
)
