package event_handler

import (
	"mime"
	"os"
	"path/filepath"
)

// GetFileInfo returns detailed information about a file
func GetFileInfo(basePath string, fileName string) *GetFileResponseData {
	fullPath := filepath.Join(basePath, fileName)
	info, err := os.Stat(fullPath)
	if err != nil {
		return nil
	}

	// Get file permissions as string
	perms := info.Mode().String()

	// Get content type based on extension
	contentType := ""
	extension := filepath.Ext(fileName)
	if !info.IsDir() && extension != "" {
		contentType = mime.TypeByExtension(extension)
	}

	return &GetFileResponseData{
		Name:        fileName,
		Path:        fullPath,
		Size:        info.Size(),
		IsDirectory: info.IsDir(),
		ModTime:     info.ModTime(),
		Permissions: perms,
		ContentType: contentType,
		Extension:   extension,
	}
}
