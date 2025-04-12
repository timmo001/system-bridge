package version

import (
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"github.com/timmo001/system-bridge/utils/http"
)

var (
	// Version is the current version of System Bridge
	// This is set via ldflags during build:
	//   For tags: The tag name (e.g. v5.0.0)
	//   For development: 5.0.0-dev+[commit-sha]
	Version string = "5.0.0"

	// LatestVersionURL is the URL to check for the latest version
	LatestVersionURL = "https://api.github.com/repos/timmo001/system-bridge/releases/latest"

	// LatestVersionUserURL is the URL to check for the latest version for the user
	LatestVersionUserURL = "https://github.com/timmo001/system-bridge/releases/latest"

	// HTTP client with caching and rate limiting
	client = http.NewClient(&http.ClientConfig{
		DefaultTTL:  5 * time.Minute,
		MaxRequests: 30, // Conservative limit for GitHub's unauthenticated API
		TimeWindow:  time.Hour,
	})
)

// GetLatestVersion fetches the latest version from GitHub with caching
func GetLatestVersion() (string, error) {
	body, err := client.Get(LatestVersionURL)
	if err != nil {
		return "", fmt.Errorf("failed to fetch latest version: %v", err)
	}

	var release struct {
		TagName string `json:"tag_name"`
	}
	if err := json.Unmarshal(body, &release); err != nil {
		return "", fmt.Errorf("failed to parse response: %v", err)
	}

	// Remove 'v' prefix if present
	version := strings.TrimPrefix(release.TagName, "v")

	// TODO: Remove this check once version 5.0.0 is officially released
	// Always ensure we don't return a version lower than 5.0.0
	if !IsNewerVersionAvailable("5.0.0", version) {
		return "5.0.0", nil
	}
	return version, nil
}

// IsNewerVersionAvailable checks if a newer version is available
func IsNewerVersionAvailable(currentVersion, latestVersion string) bool {
	// Remove 'v' prefix if present
	current := strings.TrimPrefix(currentVersion, "v")
	latest := strings.TrimPrefix(latestVersion, "v")

	// Split versions into parts
	currentParts := strings.Split(current, ".")
	latestParts := strings.Split(latest, ".")

	// Compare major, minor, and patch versions
	for i := range 3 {
		if i >= len(currentParts) {
			return true
		}
		if i >= len(latestParts) {
			return false
		}

		currentNum := 0
		latestNum := 0
		if _, err := fmt.Sscanf(currentParts[i], "%d", &currentNum); err != nil {
			currentNum = 0
		}
		if _, err := fmt.Sscanf(latestParts[i], "%d", &latestNum); err != nil {
			latestNum = 0
		}

		if latestNum > currentNum {
			return true
		}
		if currentNum > latestNum {
			return false
		}
	}

	return false
}
