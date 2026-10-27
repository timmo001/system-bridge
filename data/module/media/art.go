package media

import (
	"encoding/base64"
	"fmt"
	"log/slog"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"sync"
)

const maxArtFileSize = 5 * 1024 * 1024 // 5 MB

var (
	artCacheMu sync.Mutex
	artCache   = make(map[string]string)
)

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

	artCacheMu.Lock()
	if cached, ok := artCache[rawURL]; ok {
		artCacheMu.Unlock()
		return cached
	}
	artCacheMu.Unlock()

	info, err := os.Stat(filePath)
	if err != nil {
		slog.Debug("Could not stat cover art file", "path", filePath, "error", err)
		return ""
	}

	if info.IsDir() || info.Size() == 0 || info.Size() > maxArtFileSize {
		slog.Debug("Cover art file skipped", "path", filePath, "size", info.Size())
		return ""
	}

	data, err := os.ReadFile(filePath)
	if err != nil {
		slog.Debug("Could not read cover art file", "path", filePath, "error", err)
		return ""
	}

	ext := strings.ToLower(filepath.Ext(filePath))
	var mimeType string
	switch ext {
	case ".jpg", ".jpeg":
		mimeType = "image/jpeg"
	case ".png":
		mimeType = "image/png"
	case ".webp":
		mimeType = "image/webp"
	case ".gif":
		mimeType = "image/gif"
	case ".svg":
		mimeType = "image/svg+xml"
	case ".bmp":
		mimeType = "image/bmp"
	default:
		mimeType = http.DetectContentType(data)
	}

	if !strings.HasPrefix(mimeType, "image/") {
		slog.Debug("Cover art file has non-image MIME type", "path", filePath, "mime", mimeType)
		return ""
	}

	encoded := base64.StdEncoding.EncodeToString(data)
	dataURL := fmt.Sprintf("data:%s;base64,%s", mimeType, encoded)

	artCacheMu.Lock()
	if len(artCache) >= 20 {
		clear(artCache)
	}
	artCache[rawURL] = dataURL
	artCacheMu.Unlock()

	return dataURL
}
