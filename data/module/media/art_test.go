package media

import (
	"encoding/base64"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// pngHeader is enough of a PNG for content sniffing to recognise it
var pngHeader = []byte("\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR")

func TestResolveArtURL(t *testing.T) {
	dir := t.TempDir()
	write := func(name string, data []byte) string {
		path := filepath.Join(dir, name)
		require.NoError(t, os.WriteFile(path, data, 0o600))
		return path
	}

	assert.Equal(t, "https://example.com/art.jpg", resolveArtURL("https://example.com/art.jpg"))
	assert.Equal(t, "", resolveArtURL("relative/art.png"))

	// Chromium's artwork files have no extension
	png := write(".org.chromium.Chromium.abc123", pngHeader)
	assert.Equal(t, "data:image/png;base64,"+base64.StdEncoding.EncodeToString(pngHeader), resolveArtURL("file://"+png))

	// The extension isn't trusted
	assert.Equal(t, "", resolveArtURL("file://"+write("notes.png", []byte("not an image"))))

	svg := write("art.svg", []byte(`<?xml version="1.0"?><svg xmlns="http://www.w3.org/2000/svg"><rect/></svg>`))
	assert.True(t, strings.HasPrefix(resolveArtURL("file://"+svg), "data:image/svg+xml;base64,"))
	assert.Equal(t, "", resolveArtURL("file://"+write("fake.svg", []byte("text mentioning <svg but not one"))))
}

func TestResolveArtURLRewrittenFile(t *testing.T) {
	path := filepath.Join(t.TempDir(), "art")
	require.NoError(t, os.WriteFile(path, pngHeader, 0o600))
	first := resolveArtURL("file://" + path)

	// New artwork in the same file, as a player may write it
	gif := []byte("GIF89a\x01\x00\x01\x00\x00\x00\x00")
	require.NoError(t, os.WriteFile(path, gif, 0o600))
	later := time.Now().Add(time.Second)
	require.NoError(t, os.Chtimes(path, later, later))

	second := resolveArtURL("file://" + path)
	assert.NotEqual(t, first, second)
	assert.True(t, strings.HasPrefix(second, "data:image/gif;base64,"))
}
