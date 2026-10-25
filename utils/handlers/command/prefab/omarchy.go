package prefab

import (
	"context"
	"errors"
)

// omarchyShell reaches the Omarchy shell's IPC. The desktop module sets it at
// start up, as it can't be imported here without a cycle through settings.
var omarchyShell struct {
	running func() bool
	call    func(ctx context.Context, target string, function string, arguments ...string) (string, error)
}

// SetOmarchyShell lets prefabs see whether the Omarchy shell is running and
// call its IPC functions
func SetOmarchyShell(
	running func() bool,
	call func(ctx context.Context, target string, function string, arguments ...string) (string, error),
) {
	omarchyShell.running = running
	omarchyShell.call = call
}

func omarchyRunning() bool {
	return omarchyShell.running != nil && omarchyShell.running()
}

// omarchyIPC calls an IPC function with the command's arguments: the target,
// the function, then the function's own arguments. What it returns is the
// command's output.
func omarchyIPC(ctx context.Context, arguments []string) (string, error) {
	if err := validateOmarchyIPC(arguments); err != nil {
		return "", err
	}
	if omarchyShell.call == nil {
		return "", errors.New("the Omarchy shell isn't available")
	}
	return omarchyShell.call(ctx, arguments[0], arguments[1], arguments[2:]...)
}

func validateOmarchyIPC(arguments []string) error {
	if len(arguments) < 2 || arguments[0] == "" || arguments[1] == "" {
		return errors.New("an Omarchy shell call needs a target and a function")
	}
	return nil
}

var omarchyIPCPrefab = Prefab{
	ID:                "omarchy-ipc",
	Name:              "Omarchy shell call",
	Description:       "Call one of the Omarchy shell's IPC functions, such as media playPause, and return what it answers",
	builtin:           omarchyIPC,
	builtinWhen:       omarchyRunning,
	validateArguments: validateOmarchyIPC,
}
