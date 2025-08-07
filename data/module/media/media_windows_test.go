//go:build windows
// +build windows

package media

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestGetMediaDataWindows(t *testing.T) {
	// This test will run the actual PowerShell command.
	// It's more of an integration test for the Windows media retrieval.
	// Note: This test's success depends on media (like Spotify, a YouTube video, etc.)
	// playing on the system when the test is run.

	t.Log("Testing media data retrieval on Windows.")
	t.Log("Please ensure some media is playing for a comprehensive test.")

	// Initialize with some default data
	initialData, err := GetMediaData()
	assert.NoError(t, err, "GetMediaData should not produce an error even if no media is playing.")

	// The result can be empty if nothing is playing, which is a valid scenario.
	// So we'll just log the output for manual verification.
	if initialData.Title != nil {
		t.Logf("Successfully retrieved media data:")
		t.Logf("  Title: %s", *initialData.Title)
		if initialData.Artist != nil {
			t.Logf("  Artist: %s", *initialData.Artist)
		}
		if initialData.Status != nil {
			t.Logf("  Status: %s", *initialData.Status)
		}
	} else {
		t.Log("No active media session found, which is a valid outcome.")
	}

	// We can assert that the timestamp is recent.
	assert.NotNil(t, initialData.UpdatedAt, "UpdatedAt should always be set.")
}
