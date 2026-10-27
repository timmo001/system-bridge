package media

import (
	"context"
	"time"

	"github.com/timmo001/system-bridge/types"
)

// GetMediaData gets media information from the system
func GetMediaData(ctx context.Context) (types.MediaData, error) {
	// Get current timestamp
	now := float64(time.Now().Unix())

	// Initialize media data with default values
	mediaData := types.MediaData{
		UpdatedAt: &now,
		Players:   []types.MediaPlayer{},
	}

	// Get platform-specific media data
	return getMediaData(ctx, mediaData)
}
