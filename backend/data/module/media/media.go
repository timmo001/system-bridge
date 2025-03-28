package media

import (
	"time"

	"github.com/timmo001/system-bridge/types"
)

// GetMediaData gets media information from the system
func GetMediaData() (types.MediaData, error) {
	// Get current timestamp
	now := float64(time.Now().Unix())

	// Initialize media data with default values
	mediaData := types.MediaData{
		UpdatedAt: &now,
	}

	// Get platform-specific media data
	return getMediaData(mediaData)
}
