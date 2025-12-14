//go:build linux

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

	configHome := os.Getenv("XDG_CONFIG_HOME")
	if configHome == "" {
		configHome = filepath.Join(homeDir, ".config")
	}

	userDirs := filepath.Join(configHome, "user-dirs.dirs")
	if _, err := os.Stat(userDirs); err == nil {
		content, err := os.ReadFile(userDirs)
		if err == nil {
			lines := strings.Split(string(content), "\n")
			dirs := make(map[string]string)
			for _, line := range lines {
				if strings.HasPrefix(line, "XDG_") && strings.Contains(line, "_DIR=") {
					parts := strings.SplitN(line, "=", 2)
					if len(parts) == 2 {
						key := strings.ToLower(strings.TrimPrefix(parts[0], "XDG_"))
						key = strings.TrimSuffix(key, "_dir")
						// Normalize XDG key names to match expected convention across platforms
						// XDG uses "DOWNLOAD_DIR" (singular) but codebase expects "downloads" (plural)
						if key == "download" {
							key = "downloads"
						}
						path := strings.Trim(parts[1], "\"")
						path = strings.ReplaceAll(path, "$HOME", homeDir)
						dirs[key] = path
					}
				}
			}

			// Build DirectoryInfo list from all parsed XDG directories
			userDirs := make([]DirectoryInfo, 0, len(dirs))
			for key, path := range dirs {
				// Only include directories with non-empty paths
				if path != "" {
					userDirs = append(userDirs, DirectoryInfo{
						Key:  key,
						Path: path,
					})
				}
			}

			return userDirs
		}
	}

	// Fallback to default XDG directories
	return []DirectoryInfo{
		{Key: "desktop", Path: filepath.Join(homeDir, "Desktop")},
		{Key: "documents", Path: filepath.Join(homeDir, "Documents")},
		{Key: "downloads", Path: filepath.Join(homeDir, "Downloads")},
		{Key: "music", Path: filepath.Join(homeDir, "Music")},
		{Key: "pictures", Path: filepath.Join(homeDir, "Pictures")},
		{Key: "videos", Path: filepath.Join(homeDir, "Videos")},
	}
}

func getDirectoryContents(path string) ([]FileInfo, error) {
	entries, err := os.ReadDir(path)
	if err != nil {
		return nil, err
	}

	var files []FileInfo
	for _, entry := range entries {
		_, err := entry.Info()
		if err != nil {
			continue
		}

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
	cmd := exec.Command("xdg-open", path)
	return cmd.Run()
}
