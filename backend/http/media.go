package http

import (
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"path/filepath"
	"runtime"
	"strings"

	"github.com/timmo001/system-bridge/utils"
)

// ServeMediaFileDataHandler handles requests to serve media files from predefined base directories
func ServeMediaFileDataHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusMethodNotAllowed)
		if err := json.NewEncoder(w).Encode(map[string]string{"error": "Method not allowed"}); err != nil {
			slog.Error("Failed to encode response", "error", err)
		}
		return
	}

	// Get query parameters
	base := r.URL.Query().Get("base")
	path := r.URL.Query().Get("path")
	token := r.URL.Query().Get("token")

	// Validate required parameters
	if base == "" || path == "" || token == "" {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusBadRequest)
		if err := json.NewEncoder(w).Encode(map[string]string{"error": "Missing required parameters: base, path, token"}); err != nil {
			slog.Error("Failed to encode response", "error", err)
		}
		return
	}

	// Validate API token
	expectedToken, err := utils.LoadToken()
	if err != nil {
		slog.Error("Failed to load token for authentication", "error", err)
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusInternalServerError)
		if err := json.NewEncoder(w).Encode(map[string]string{"error": "Authentication error"}); err != nil {
			slog.Error("Failed to encode response", "error", err)
		}
		return
	}

	if token != expectedToken {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusUnauthorized)
		if err := json.NewEncoder(w).Encode(map[string]string{"error": "Invalid API token"}); err != nil {
			slog.Error("Failed to encode response", "error", err)
		}
		return
	}

	// Get base directory path
	basePath, err := getBaseDirectoryPath(base)
	if err != nil {
		slog.Error("Invalid base directory", "base", base, "error", err)
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusBadRequest)
		if err := json.NewEncoder(w).Encode(map[string]string{"error": "Invalid base directory"}); err != nil {
			slog.Error("Failed to encode response", "error", err)
		}
		return
	}

	// Construct full file path
	fullPath := filepath.Join(basePath, path)

	// Security: Clean and validate path to prevent directory traversal
	cleanPath := filepath.Clean(fullPath)
	relPath, err := filepath.Rel(basePath, cleanPath)
	if err != nil || strings.HasPrefix(relPath, "..") {
		slog.Error("Path traversal attempt detected", "requested_path", fullPath, "base_path", basePath, "rel_path", relPath)
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusForbidden)
		if err := json.NewEncoder(w).Encode(map[string]string{"error": "Access denied"}); err != nil {
			slog.Error("Failed to encode response", "error", err)
		}
		return
	}

	// Check if file exists
	fileInfo, err := os.Stat(cleanPath)
	if err != nil {
		if os.IsNotExist(err) {
			slog.Info("File not found", "path", cleanPath)
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusNotFound)
			if err := json.NewEncoder(w).Encode(map[string]string{"error": "File not found"}); err != nil {
				slog.Error("Failed to encode response", "error", err)
			}
			return
		}
		slog.Error("Failed to stat file", "path", cleanPath, "error", err)
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusInternalServerError)
		if err := json.NewEncoder(w).Encode(map[string]string{"error": "Internal server error"}); err != nil {
			slog.Error("Failed to encode response", "error", err)
		}
		return
	}

	// Ensure it's a regular file (not a directory)
	if !fileInfo.Mode().IsRegular() {
		slog.Error("Requested path is not a regular file", "path", cleanPath)
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusBadRequest)
		if err := json.NewEncoder(w).Encode(map[string]string{"error": "Path is not a file"}); err != nil {
			slog.Error("Failed to encode response", "error", err)
		}
		return
	}

	// Basic file type restrictions (allow common media types)
	ext := strings.ToLower(filepath.Ext(cleanPath))
	allowedExtensions := map[string]bool{
		".jpg": true, ".jpeg": true, ".png": true, ".gif": true, ".bmp": true, ".webp": true,
		".mp3": true, ".wav": true, ".flac": true, ".aac": true, ".ogg": true, ".m4a": true,
		".mp4": true, ".avi": true, ".mkv": true, ".mov": true, ".wmv": true, ".webm": true,
		".txt": true, ".pdf": true, ".doc": true, ".docx": true, ".xls": true, ".xlsx": true,
	}

	if !allowedExtensions[ext] {
		slog.Error("File type not allowed", "extension", ext, "path", cleanPath)
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusForbidden)
		if err := json.NewEncoder(w).Encode(map[string]string{"error": "File type not allowed"}); err != nil {
			slog.Error("Failed to encode response", "error", err)
		}
		return
	}

	// Size limit (100MB)
	const maxFileSize = 100 * 1024 * 1024 // 100MB
	if fileInfo.Size() > maxFileSize {
		slog.Error("File too large", "size", fileInfo.Size(), "max_size", maxFileSize)
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusRequestEntityTooLarge)
		if err := json.NewEncoder(w).Encode(map[string]string{"error": "File too large"}); err != nil {
			slog.Error("Failed to encode response", "error", err)
		}
		return
	}

	// Set appropriate headers
	contentType := getContentType(cleanPath)
	w.Header().Set("Content-Type", contentType)
	w.Header().Set("Content-Length", fmt.Sprintf("%d", fileInfo.Size()))
	w.Header().Set("Content-Disposition", fmt.Sprintf("inline; filename=\"%s\"", filepath.Base(cleanPath)))

	// Serve the file
	slog.Info("Serving media file", "path", cleanPath, "size", fileInfo.Size())
	http.ServeFile(w, r, cleanPath)
}

// getBaseDirectoryPath returns the absolute path for a base directory key
func getBaseDirectoryPath(base string) (string, error) {
	var basePath string
	var err error

	switch base {
	case "documents":
		basePath, err = getDocumentsPath()
	case "downloads":
		basePath, err = getDownloadsPath()
	case "home":
		basePath, err = getHomePath()
	case "music":
		basePath, err = getMusicPath()
	case "pictures":
		basePath, err = getPicturesPath()
	case "videos":
		basePath, err = getVideosPath()
	default:
		return "", fmt.Errorf("invalid base directory: %s", base)
	}

	if err != nil {
		return "", fmt.Errorf("failed to get %s path: %w", base, err)
	}

	return basePath, nil
}

// getContentType returns the MIME content type for a file based on its extension
func getContentType(filename string) string {
	ext := strings.ToLower(filepath.Ext(filename))
	switch ext {
	case ".jpg", ".jpeg":
		return "image/jpeg"
	case ".png":
		return "image/png"
	case ".gif":
		return "image/gif"
	case ".bmp":
		return "image/bmp"
	case ".webp":
		return "image/webp"
	case ".mp3":
		return "audio/mpeg"
	case ".wav":
		return "audio/wav"
	case ".flac":
		return "audio/flac"
	case ".aac":
		return "audio/aac"
	case ".ogg":
		return "audio/ogg"
	case ".m4a":
		return "audio/mp4"
	case ".mp4":
		return "video/mp4"
	case ".avi":
		return "video/x-msvideo"
	case ".mkv":
		return "video/x-matroska"
	case ".mov":
		return "video/quicktime"
	case ".wmv":
		return "video/x-ms-wmv"
	case ".webm":
		return "video/webm"
	case ".txt":
		return "text/plain"
	case ".pdf":
		return "application/pdf"
	case ".doc":
		return "application/msword"
	case ".docx":
		return "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
	case ".xls":
		return "application/vnd.ms-excel"
	case ".xlsx":
		return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
	default:
		return "application/octet-stream"
	}
}

// Platform-specific directory path functions
func getDocumentsPath() (string, error) {
	homeDir, err := os.UserHomeDir()
	if err != nil {
		return "", err
	}

	// Platform-specific document directories
	switch runtime.GOOS {
	case "windows":
		return filepath.Join(homeDir, "Documents"), nil
	case "darwin":
		return filepath.Join(homeDir, "Documents"), nil
	default: // linux and others
		return filepath.Join(homeDir, "Documents"), nil
	}
}

func getDownloadsPath() (string, error) {
	homeDir, err := os.UserHomeDir()
	if err != nil {
		return "", err
	}

	// Platform-specific download directories
	switch runtime.GOOS {
	case "windows":
		return filepath.Join(homeDir, "Downloads"), nil
	case "darwin":
		return filepath.Join(homeDir, "Downloads"), nil
	default: // linux and others
		return filepath.Join(homeDir, "Downloads"), nil
	}
}

func getHomePath() (string, error) {
	return os.UserHomeDir()
}

func getMusicPath() (string, error) {
	homeDir, err := os.UserHomeDir()
	if err != nil {
		return "", err
	}

	// Platform-specific music directories
	switch runtime.GOOS {
	case "windows":
		return filepath.Join(homeDir, "Music"), nil
	case "darwin":
		return filepath.Join(homeDir, "Music"), nil
	default: // linux and others
		return filepath.Join(homeDir, "Music"), nil
	}
}

func getPicturesPath() (string, error) {
	homeDir, err := os.UserHomeDir()
	if err != nil {
		return "", err
	}

	// Platform-specific pictures directories
	switch runtime.GOOS {
	case "windows":
		return filepath.Join(homeDir, "Pictures"), nil
	case "darwin":
		return filepath.Join(homeDir, "Pictures"), nil
	default: // linux and others
		return filepath.Join(homeDir, "Pictures"), nil
	}
}

func getVideosPath() (string, error) {
	homeDir, err := os.UserHomeDir()
	if err != nil {
		return "", err
	}

	// Platform-specific videos directories
	switch runtime.GOOS {
	case "windows":
		return filepath.Join(homeDir, "Videos"), nil
	case "darwin":
		return filepath.Join(homeDir, "Videos"), nil
	default: // linux and others
		return filepath.Join(homeDir, "Videos"), nil
	}
}
