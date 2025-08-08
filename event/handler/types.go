package event_handler

import "time"

// GetFileResponseData represents information about a file
type GetFileResponseData struct {
	Name        string    `json:"name" mapstructure:"name"`
	Path        string    `json:"path" mapstructure:"path"`
	Size        int64     `json:"size" mapstructure:"size"`
	IsDirectory bool      `json:"isDirectory" mapstructure:"isDirectory"`
	ModTime     time.Time `json:"modTime" mapstructure:"modTime"`
	Permissions string    `json:"permissions" mapstructure:"permissions"`
	ContentType string    `json:"contentType,omitempty" mapstructure:"contentType,omitempty"`
	Extension   string    `json:"extension,omitempty" mapstructure:"extension,omitempty"`
}

// GetDirectoriesResponseDataItem represents a directory item in the response
type GetDirectoriesResponseDataItem struct {
	Key         string `json:"key" mapstructure:"key"`
	Name        string `json:"name" mapstructure:"name"`
	Path        string `json:"path" mapstructure:"path"`
	Description string `json:"description,omitempty" mapstructure:"description,omitempty"`
}
