package services

import (
	"context"
	"errors"
	"fmt"
	"slices"
	"strings"
	"time"

	"github.com/timmo001/system-bridge/settings"
	"github.com/timmo001/system-bridge/types"
)

const (
	// actTimeout is how long an action may run, as for commands
	actTimeout = 5 * time.Minute
	// maxActOutput keeps an action's output small, as it goes to every client
	maxActOutput = 64 << 10
	// maxSummary is as much of a line as a summary keeps
	maxSummary = 200
)

// ErrActionNotFound is an action that isn't in the latest data, or can't run
var ErrActionNotFound = errors.New("service action not found")

// Check finds the act command to run an action with. The action must be in
// the latest data and not disabled, and the provider must have an act
// command, so only what a provider listed can run.
func Check(data types.ServicesData, providers []settings.SettingsServiceProvider, provider, item, action string) ([]string, error) {
	index := slices.IndexFunc(providers, func(p settings.SettingsServiceProvider) bool { return p.ID == provider })
	if index < 0 {
		return nil, fmt.Errorf("%w: no provider %s", ErrActionNotFound, provider)
	}
	act := providers[index].Act
	if len(act) == 0 || act[0] == "" {
		return nil, fmt.Errorf("%w: the %s provider has no act command", ErrActionNotFound, provider)
	}

	itemIndex := slices.IndexFunc(data.Items, func(i types.ServiceItem) bool { return i.Provider == provider && i.ID == item })
	if itemIndex < 0 {
		return nil, fmt.Errorf("%w: the %s provider has no item %s", ErrActionNotFound, provider, item)
	}
	actions := data.Items[itemIndex].Actions
	actionIndex := slices.IndexFunc(actions, func(a types.ServiceAction) bool { return a.ID == action })
	if actionIndex < 0 {
		return nil, fmt.Errorf("%w: %s has no action %s", ErrActionNotFound, item, action)
	}
	if disabled := actions[actionIndex].Disabled; disabled != nil {
		return nil, fmt.Errorf("%w: %s is disabled: %s", ErrActionNotFound, action, *disabled)
	}

	return slices.Clone(act), nil
}

// Run runs an action with the provider's act command, with the item and
// action appended
func Run(ctx context.Context, act []string, provider, item, action string) types.ServiceActionResult {
	result := types.ServiceActionResult{Provider: provider, Item: item, Action: action}

	out, err := run(ctx, append(slices.Clone(act), item, action), actTimeout, maxActOutput)
	output := out.stdout
	if out.stderr != "" {
		if output != "" && !strings.HasSuffix(output, "\n") {
			output += "\n"
		}
		output += out.stderr
	}
	if len(output) > maxActOutput || out.stdoutTruncated {
		output = output[:min(len(output), maxActOutput)] + "\n... (output truncated)"
	}
	result.Output = output

	switch {
	case err != nil:
		result.Summary = firstLine(err.Error())
	case out.exitCode != 0:
		result.Summary = fmt.Sprintf("Exited with code %d", out.exitCode)
		if line := firstLine(out.stderr); line != "" {
			result.Summary += ": " + line
		}
	default:
		result.OK = true
		result.Summary = firstLine(out.stdout)
		if result.Summary == "" {
			result.Summary = "Done"
		}
	}
	return result
}

// firstLine is text's first line that isn't blank, cut to maxSummary
func firstLine(text string) string {
	for line := range strings.SplitSeq(text, "\n") {
		if line = strings.TrimSpace(line); line != "" {
			if len(line) > maxSummary {
				line = line[:maxSummary] + "..."
			}
			return line
		}
	}
	return ""
}
