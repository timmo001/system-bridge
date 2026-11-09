package filesystem

import (
	"mime"
	"os"
	"path/filepath"
	"strings"

	"github.com/adrg/xdg"
)

// DirectoryInfo represents information about a directory
type DirectoryInfo struct {
	Key  string `json:"key" mapstructure:"key"`
	Path string `json:"path" mapstructure:"path"`
}

// FileInfo represents information about a file
type FileInfo struct {
	Name      string `json:"name" mapstructure:"name"`
	Path      string `json:"path" mapstructure:"path"`
	Size      int64  `json:"size" mapstructure:"size"`
	Modified  int64  `json:"modified" mapstructure:"modified"`
	Extension string `json:"extension" mapstructure:"extension"`
	MimeType  string `json:"mime_type" mapstructure:"mime_type"`
}

// GetUserDirectories returns the user's own folders: from user-dirs.dirs on
// Linux and the known folders on Windows, so renamed or moved ones are found
func GetUserDirectories() []DirectoryInfo {
	return []DirectoryInfo{
		{Key: "desktop", Path: xdg.UserDirs.Desktop},
		{Key: "documents", Path: xdg.UserDirs.Documents},
		{Key: "downloads", Path: xdg.UserDirs.Download},
		{Key: "music", Path: xdg.UserDirs.Music},
		{Key: "pictures", Path: xdg.UserDirs.Pictures},
		{Key: "videos", Path: xdg.UserDirs.Videos},
	}
}

// GetFileInfo returns information about a file
func GetFileInfo(path string) (*FileInfo, error) {
	info, err := os.Stat(path)
	if err != nil {
		return nil, err
	}

	ext := filepath.Ext(path)
	mimeType := mime.TypeByExtension(ext)
	if mimeType == "" {
		mimeType = "application/octet-stream"
	}

	return &FileInfo{
		Name:      info.Name(),
		Path:      path,
		Size:      info.Size(),
		Modified:  info.ModTime().UnixMilli(),
		Extension: strings.TrimPrefix(ext, "."),
		MimeType:  mimeType,
	}, nil
}

// OpenFile opens a file with the default application
func OpenFile(path string) error {
	return openFile(path)
}
