package version

import (
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"github.com/timmo001/system-bridge/utils/http"
)

var (
	// ReleasesURL is the URL listing the newest releases, with their notes
	ReleasesURL = "https://api.github.com/repos/timmo001/system-bridge/releases?per_page=10"

	// ReleasesUserURL is the page listing every release, for the user
	ReleasesUserURL = "https://github.com/timmo001/system-bridge/releases"

	// releasesClient keeps the list for hours: release notes rarely change,
	// and a failed request falls back to the last list it had
	releasesClient = http.NewClient(&http.ClientConfig{
		DefaultTTL:            6 * time.Hour,
		RequestTimeout:        10 * time.Second,
		ResponseHeaderTimeout: 5 * time.Second,
	})
)

// Release is a published System Bridge release and its notes
type Release struct {
	// Version is the release's tag, without any leading v
	Version     string    `json:"version"`
	Name        string    `json:"name"`
	PublishedAt time.Time `json:"publishedAt"`
	URL         string    `json:"url"`
	// Notes are the release notes, in Markdown
	Notes string `json:"notes"`
	// Newer says whether the release is newer than this build
	Newer bool `json:"newer"`
	// Installed says whether this build is the release
	Installed bool `json:"installed"`
}

// githubRelease is a release as GitHub's API answers it
type githubRelease struct {
	TagName     string    `json:"tag_name"`
	Name        string    `json:"name"`
	PublishedAt time.Time `json:"published_at"`
	HTMLURL     string    `json:"html_url"`
	Body        string    `json:"body"`
	Draft       bool      `json:"draft"`
	Prerelease  bool      `json:"prerelease"`
}

// GetReleases fetches the newest stable releases from GitHub with caching,
// newest first, each marked against this build's version
func GetReleases() ([]Release, error) {
	body, err := releasesClient.Get(ReleasesURL)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch releases: %v", err)
	}
	return parseReleases(body, Version)
}

// parseReleases reads GitHub's release list, keeping the stable releases and
// marking each against the version current
func parseReleases(body []byte, current string) ([]Release, error) {
	var list []githubRelease
	if err := json.Unmarshal(body, &list); err != nil {
		return nil, fmt.Errorf("failed to parse releases: %v", err)
	}

	installed := strings.TrimPrefix(current, "v")
	releases := make([]Release, 0, len(list))
	for _, r := range list {
		if r.Draft || r.Prerelease {
			continue
		}
		version := strings.TrimPrefix(r.TagName, "v")
		name := r.Name
		if name == "" {
			name = version
		}
		releases = append(releases, Release{
			Version:     version,
			Name:        name,
			PublishedAt: r.PublishedAt,
			URL:         r.HTMLURL,
			Notes:       r.Body,
			Newer:       IsNewerVersionAvailable(current, version),
			Installed:   version == installed,
		})
	}
	return releases, nil
}
