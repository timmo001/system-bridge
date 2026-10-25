package prefab

import (
	"os"
	"path/filepath"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestExpand(t *testing.T) {
	pictures := t.TempDir()
	t.Setenv("XDG_PICTURES_DIR", pictures)
	originalNow := now
	t.Cleanup(func() { now = originalNow })
	now = func() time.Time { return time.Date(2026, 10, 25, 14, 30, 0, 0, time.Local) }

	dir := filepath.Join(pictures, "Screenshots")
	file := filepath.Join(dir, "screenshot-20261025-143000.png")

	t.Run("fills in the file, folder and name, and creates the folder", func(t *testing.T) {
		arguments, env, output, err := Expand(
			[]string{"-o", "{outputDir}", "-f", "{outputName}", "{output}"},
			[]string{"OMASNAP_SCREENSHOT_DIR={outputDir}"},
		)

		require.NoError(t, err)
		assert.Equal(t, Output{Path: file, Dir: dir}, output)
		assert.Equal(t, []string{"-o", dir, "-f", "screenshot-20261025-143000.png", file}, arguments)
		assert.Equal(t, []string{"OMASNAP_SCREENSHOT_DIR=" + dir}, env)
		assert.DirExists(t, dir)
	})

	t.Run("leaves arguments without placeholders alone", func(t *testing.T) {
		arguments, env, output, err := Expand([]string{"lock-session"}, nil)

		require.NoError(t, err)
		assert.Equal(t, Output{}, output)
		assert.Equal(t, []string{"lock-session"}, arguments)
		assert.Nil(t, env)
	})
}

func TestSaved(t *testing.T) {
	dir := t.TempDir()
	started := time.Now().Add(-time.Minute)
	output := Output{Path: filepath.Join(dir, "screenshot-20261025-143000.png"), Dir: dir}

	old := filepath.Join(dir, "old.png")
	require.NoError(t, os.WriteFile(old, nil, 0o644))
	require.NoError(t, os.Chtimes(old, started.Add(-time.Hour), started.Add(-time.Hour)))

	_, ok := output.Saved(started)
	assert.False(t, ok, "a file from before the run isn't the screenshot")

	// omasnap names its own file
	own := filepath.Join(dir, "screenshot-2026-10-25_14-30-00.png")
	require.NoError(t, os.WriteFile(own, nil, 0o644))
	saved, ok := output.Saved(started)
	assert.True(t, ok)
	assert.Equal(t, own, saved)

	require.NoError(t, os.WriteFile(output.Path, nil, 0o644))
	saved, ok = output.Saved(started)
	assert.True(t, ok)
	assert.Equal(t, output.Path, saved, "the path it was given wins")
}
