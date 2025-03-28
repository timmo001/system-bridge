package filesystem

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

// GetUserDirectories returns a list of user directories
func GetUserDirectories() []DirectoryInfo {
	return getUserDirectories()
}

// GetDirectoryContents returns the contents of a directory
func GetDirectoryContents(path string) ([]FileInfo, error) {
	return getDirectoryContents(path)
}

// GetFileInfo returns information about a file
func GetFileInfo(path string) (*FileInfo, error) {
	return getFileInfo(path)
}

// OpenFile opens a file with the default application
func OpenFile(path string) error {
	return openFile(path)
}
