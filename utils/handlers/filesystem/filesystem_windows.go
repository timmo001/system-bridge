//go:build windows

package filesystem

import (
	"encoding/json"
	"mime"
	"os"
	"os/exec"
	"path/filepath"
	"strings"

	"github.com/timmo001/system-bridge/utils"
)

func getUserDirectories() []DirectoryInfo {
	// Get known folder paths using PowerShell
	script := `
$folders = @{
	"Desktop" = [System.Environment]::GetFolderPath("Desktop")
	"Documents" = [System.Environment]::GetFolderPath("MyDocuments")
	"Downloads" = (New-Object -ComObject Shell.Application).NameSpace("shell:Downloads").Self.Path
	"Music" = [System.Environment]::GetFolderPath("MyMusic")
	"Pictures" = [System.Environment]::GetFolderPath("MyPictures")
	"Videos" = [System.Environment]::GetFolderPath("MyVideos")
}
$folders | ConvertTo-Json
`
	cmd := exec.Command("powershell", "-Command", script)
	utils.SetHideWindow(cmd)
	output, err := cmd.Output()
	if err != nil {
		// Fallback to default paths
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
			{Key: "videos", Path: filepath.Join(homeDir, "Videos")},
		}
	}

	// Parse JSON output
	var dirs map[string]string
	if err := json.Unmarshal(output, &dirs); err != nil {
		return nil
	}

	return []DirectoryInfo{
		{Key: "desktop", Path: dirs["Desktop"]},
		{Key: "documents", Path: dirs["Documents"]},
		{Key: "downloads", Path: dirs["Downloads"]},
		{Key: "music", Path: dirs["Music"]},
		{Key: "pictures", Path: dirs["Pictures"]},
		{Key: "videos", Path: dirs["Videos"]},
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
	cmd := exec.Command("cmd", "/c", "start", "", path)
	utils.SetHideWindow(cmd)
	return cmd.Run()
}
