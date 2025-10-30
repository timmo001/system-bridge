//go:build darwin

package filesystem

import (
	"mime"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
)

func getUserDirectories() []DirectoryInfo {
	homeDir, err := os.UserHomeDir()
	if err != nil {
		return nil
	}

	return []DirectoryInfo{
		{Key: "desktop", Path: filepath.Join(homeDir, "Desktop")},
		{Key: "documents", Path: filepath.Join(homeDir, "Documents")},
		{Key: "downloads", Path: filepath.Join(homeDir, "Downloads")},
		{Key: "music", Path: filepath.Join(homeDir, "Music")},
		{Key: "pictures", Path: filepath.Join(homeDir, "Pictures")},
		{Key: "videos", Path: filepath.Join(homeDir, "Movies")},
	}
}

func getDirectoryContents(path string) ([]FileInfo, error) {
	entries, err := os.ReadDir(path)
	if err != nil {
		return nil, err
	}

	var files []FileInfo
	for _, entry := range entries {
		filePath := filepath.Join(path, entry.Name())
		fileInfo, err := getFileInfo(filePath)
		if err != nil {
			continue
		}

		files = append(files, *fileInfo)
	}

	return files, nil
}

func getFileInfo(path string) (*FileInfo, error) {
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

func openFile(path string) error {
	cmd := exec.Command("open", path)
	return cmd.Run()
}
