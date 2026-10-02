package event_handler

import (
	"os"
	"path/filepath"
	"testing"

	"github.com/stretchr/testify/require"
)

func TestGetFilesSkipsEntriesThatCannotBeStatted(t *testing.T) {
	dir := t.TempDir()
	require.NoError(t, os.WriteFile(filepath.Join(dir, "ok.txt"), []byte("hi"), 0o644))
	err := os.Symlink(filepath.Join(dir, "missing-target"), filepath.Join(dir, "broken"))
	if err != nil {
		t.Skipf("symlinks are not available: %v", err)
	}

	files := GetFiles(dir)

	require.Len(t, files, 1)
	require.Equal(t, "ok.txt", files[0].Name)
}
