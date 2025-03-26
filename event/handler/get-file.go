package event_handler

import (
	"os"
	"path/filepath"

	"github.com/charmbracelet/log"
	"github.com/mitchellh/mapstructure"
	"github.com/timmo001/system-bridge/event"
)

type GetFileRequestData struct {
	BaseDirectory string `json:"base" mapstructure:"base"`
	Path          string `json:"path" mapstructure:"path"`
}

type GetFileResponseData struct {
	Name         string  `json:"name" mapstructure:"name"`
	Path         string  `json:"path" mapstructure:"path"`
	FullPath     string  `json:"fullpath" mapstructure:"fullpath"`
	Size         int     `json:"size" mapstructure:"size"`
	LastAccessed float64 `json:"last_accessed" mapstructure:"last_accessed"`
	Created      float64 `json:"created" mapstructure:"created"`
	Modified     float64 `json:"modified" mapstructure:"modified"`
	IsDirectory  bool    `json:"is_directory" mapstructure:"is_directory"`
	IsFile       bool    `json:"is_file" mapstructure:"is_file"`
	IsLink       bool    `json:"is_link" mapstructure:"is_link"`
	MimeType     string  `json:"mime_type,omitempty" mapstructure:"mime_type,omitempty"`
}

func GetFileInfo(basePath, path string) *GetFileResponseData {
	fullPath := filepath.Join(basePath, path)
	info, err := os.Stat(fullPath)
	if err != nil {
		log.Errorf("Failed to get file info: %v", err)
		return nil
	}

	return &GetFileResponseData{
		Name:         info.Name(),
		Path:         path,
		FullPath:     fullPath,
		Size:         int(info.Size()),
		LastAccessed: float64(info.ModTime().Unix()),
		Created:      float64(info.ModTime().Unix()),
		Modified:     float64(info.ModTime().Unix()),
		IsDirectory:  info.IsDir(),
		IsFile:       !info.IsDir(),
		IsLink:       false, // TODO: Implement
		MimeType:     "",    // TODO: Implement
	}
}

func RegisterGetFileHandler(router *event.MessageRouter) {
	router.RegisterSimpleHandler(event.EventGetFile, func(message event.Message) event.MessageResponse {
		log.Infof("Received get file event: %v", message)

		var data GetFileRequestData
		if err := mapstructure.Decode(message.Data, &data); err != nil {
			return event.MessageResponse{
				ID:      message.ID,
				Type:    event.ResponseTypeError,
				Subtype: event.ResponseSubtypeBadRequest,
				Message: "Invalid request data format: " + err.Error(),
			}
		}

		// Get directory
		directory := GetDirectory(router, data.BaseDirectory)
		if directory == nil {
			return event.MessageResponse{
				ID:      message.ID,
				Type:    event.ResponseTypeError,
				Subtype: event.ResponseSubtypeBadDirectory,
			}
		}

		// Get file info
		fileInfo := GetFileInfo(directory.Path, data.Path)
		if fileInfo == nil {
			return event.MessageResponse{
				ID:      message.ID,
				Type:    event.ResponseTypeError,
				Subtype: event.ResponseSubtypeBadFile,
			}
		}

		return event.MessageResponse{
			ID:      message.ID,
			Type:    event.ResponseTypeFile,
			Subtype: event.ResponseSubtypeNone,
			Data:    fileInfo,
			Message: "Got file",
		}
	})
}
