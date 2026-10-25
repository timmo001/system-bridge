package prefab

import (
	"fmt"
	"os"
	"path/filepath"
	"slices"
	"strings"
	"time"
)

// Placeholders in a prefab's arguments and variables for the file it saves,
// and the home folder. Tools such as hyprshot take the folder and the file
// name separately.
const (
	outputPlaceholder     = "{output}"
	outputDirPlaceholder  = "{outputDir}"
	outputNamePlaceholder = "{outputName}"
	homePlaceholder       = "{home}"
)

var now = time.Now

// Output is where a prefab saves its file. It's empty when the prefab saves
// nothing.
type Output struct {
	Path string
	Dir  string
}

// screenshotDir is the Screenshots folder in the user's pictures folder
func screenshotDir() (string, error) {
	pictures := os.Getenv("XDG_PICTURES_DIR")
	if pictures == "" {
		home, err := os.UserHomeDir()
		if err != nil {
			return "", fmt.Errorf("find the home folder: %w", err)
		}
		pictures = filepath.Join(home, "Pictures")
	}
	return filepath.Join(pictures, "Screenshots"), nil
}

func hasPlaceholder(value string) bool {
	return strings.Contains(value, outputPlaceholder) ||
		strings.Contains(value, outputDirPlaceholder) ||
		strings.Contains(value, outputNamePlaceholder)
}

// Expand fills in {home} with the home folder, and the output placeholders in
// arguments and KEY=VALUE variables, creating the folder they point to.
// Without output placeholders the Output is empty.
func Expand(arguments []string, env []string) ([]string, []string, Output, error) {
	if slices.ContainsFunc(arguments, func(argument string) bool { return strings.Contains(argument, homePlaceholder) }) {
		home, err := os.UserHomeDir()
		if err != nil {
			return nil, nil, Output{}, fmt.Errorf("find the home folder: %w", err)
		}
		expanded := make([]string, len(arguments))
		for i, argument := range arguments {
			expanded[i] = strings.ReplaceAll(argument, homePlaceholder, home)
		}
		arguments = expanded
	}

	if !slices.ContainsFunc(arguments, hasPlaceholder) && !slices.ContainsFunc(env, hasPlaceholder) {
		return arguments, env, Output{}, nil
	}

	dir, err := screenshotDir()
	if err != nil {
		return nil, nil, Output{}, err
	}
	if err := os.MkdirAll(dir, 0o755); err != nil {
		return nil, nil, Output{}, fmt.Errorf("create %s: %w", dir, err)
	}
	name := "screenshot-" + now().Format("20060102-150405") + ".png"
	output := Output{Path: filepath.Join(dir, name), Dir: dir}

	replacer := strings.NewReplacer(
		outputPlaceholder, output.Path,
		outputDirPlaceholder, dir,
		outputNamePlaceholder, name,
	)
	replace := func(values []string) []string {
		replaced := make([]string, len(values))
		for i, value := range values {
			replaced[i] = replacer.Replace(value)
		}
		return replaced
	}
	return replace(arguments), replace(env), output, nil
}

// Saved is the file the program saved: the path it was given, or else the
// newest file it saved to the folder since it started, for programs such as
// omasnap that name their own files
func (o Output) Saved(since time.Time) (string, bool) {
	if _, err := os.Stat(o.Path); err == nil {
		return o.Path, true
	}
	entries, err := os.ReadDir(o.Dir)
	if err != nil {
		return "", false
	}
	newest := ""
	var newestTime time.Time
	for _, entry := range entries {
		info, err := entry.Info()
		if err != nil || !info.Mode().IsRegular() || info.ModTime().Before(since) {
			continue
		}
		if newest == "" || info.ModTime().After(newestTime) {
			newest, newestTime = filepath.Join(o.Dir, entry.Name()), info.ModTime()
		}
	}
	return newest, newest != ""
}
