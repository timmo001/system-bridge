package media

import (
	"bytes"
	"encoding/base64"
	"encoding/xml"
	"errors"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"sync"
	"time"
)

const (
	maxArtFileSize = 5 * 1024 * 1024 // 5 MB
	maxCachedArt   = 8
)

// artCache holds local artwork already resolved. Each player can report its
// own, so it holds a few, and starts over when full to bound its memory.
var artCache struct {
	sync.Mutex
	dataURLs map[artKey]string
}

// artKey identifies a version of an artwork file, so rewriting the file with
// new artwork misses the cache
type artKey struct {
	path    string
	size    int64
	modTime time.Time
}

func fileURLToPath(rawURL string) string {
	if !strings.HasPrefix(rawURL, "file://") {
		return ""
	}
	var p string
	if u, err := url.Parse(rawURL); err == nil && u.Scheme == "file" {
		p = u.Path
	} else if unescaped, err := url.PathUnescape(strings.TrimPrefix(rawURL, "file://")); err == nil {
		p = unescaped
	} else {
		p = strings.TrimPrefix(rawURL, "file://")
	}
	if runtime.GOOS == "windows" && len(p) > 2 && p[0] == '/' && p[2] == ':' {
		p = p[1:]
	}
	return p
}

// resolveArtURL turns an artwork URL from a media player into a URL a client
// can load. Remote URLs (http, https) and already-encoded data: URIs are
// returned as-is. Local file: URIs (or absolute paths) are read from disk
// and encoded into base64 data:image/... URIs, cached in memory.
func resolveArtURL(rawURL string) string {
	rawURL = strings.TrimSpace(rawURL)
	if rawURL == "" {
		return ""
	}

	if strings.HasPrefix(rawURL, "https://") ||
		strings.HasPrefix(rawURL, "http://") ||
		strings.HasPrefix(rawURL, "data:image/") {
		return rawURL
	}

	var filePath string
	if strings.HasPrefix(rawURL, "file://") {
		filePath = fileURLToPath(rawURL)
	} else if filepath.IsAbs(rawURL) {
		filePath = rawURL
	} else {
		return ""
	}

	if filePath == "" {
		return ""
	}

	filePath = filepath.Clean(filePath)

	info, err := os.Stat(filePath)
	if err != nil {
		slog.Debug("Could not stat cover art file", "path", filePath, "error", err)
		return ""
	}

	if info.IsDir() || info.Size() == 0 || info.Size() > maxArtFileSize {
		slog.Debug("Cover art file skipped", "path", filePath, "size", info.Size())
		return ""
	}

	key := artKey{path: filePath, size: info.Size(), modTime: info.ModTime()}
	artCache.Lock()
	if dataURL, ok := artCache.dataURLs[key]; ok {
		artCache.Unlock()
		return dataURL
	}
	artCache.Unlock()

	data, err := os.ReadFile(filePath)
	if err != nil {
		slog.Debug("Could not read cover art file", "path", filePath, "error", err)
		return ""
	}

	// The player chooses the path, so trust what the file holds rather than
	// its name, which keeps other files from being sent as images
	mimeType := http.DetectContentType(data)
	if !strings.HasPrefix(mimeType, "image/") && strings.EqualFold(filepath.Ext(filePath), ".svg") && isSVG(data) {
		mimeType = "image/svg+xml"
	}
	if !strings.HasPrefix(mimeType, "image/") {
		slog.Debug("Cover art file isn't an image", "path", filePath, "mime", mimeType)
		return ""
	}

	dataURL := fmt.Sprintf("data:%s;base64,%s", mimeType, base64.StdEncoding.EncodeToString(data))

	artCache.Lock()
	if artCache.dataURLs == nil || len(artCache.dataURLs) >= maxCachedArt {
		artCache.dataURLs = make(map[artKey]string, maxCachedArt)
	}
	artCache.dataURLs[key] = dataURL
	artCache.Unlock()

	return dataURL
}

// isSVG reports whether data is well-formed XML with an svg root element, as
// content sniffing doesn't recognise SVG
func isSVG(data []byte) bool {
	decoder := xml.NewDecoder(bytes.NewReader(data))
	depth := 0
	rootSeen := false
	for {
		token, err := decoder.Token()
		if errors.Is(err, io.EOF) {
			return rootSeen && depth == 0
		}
		if err != nil {
			return false
		}
		switch token := token.(type) {
		case xml.StartElement:
			if depth == 0 {
				if rootSeen || token.Name.Local != "svg" {
					return false
				}
				rootSeen = true
			}
			depth++
		case xml.EndElement:
			depth--
		}
	}
}
