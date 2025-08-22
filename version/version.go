package version

import (
	"encoding/json"
	"fmt"
	"regexp"
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

// APIVersion returns a PEP 440-compatible version string for external consumers
// such as Home Assistant. It preserves packaging/versioning inputs while
// normalizing common development and Arch -git formats:
//   - v5.0.0 -> 5.0.0
//   - 5.0.0-dev+<sha> -> 5.0.0.dev0+<sha>
//   - 5.0.0-beta.8 -> 5.0.0b8
//   - 5.0.0.beta.8.r12.g<sha> -> 5.0.0b8.dev12+g<sha>
func APIVersion() string {
	return normalizeToPEP440(Version)
}

func normalizeToPEP440(v string) string {
	s := strings.TrimSpace(v)
	if s == "" {
		return s
	}

	// Strip leading 'v' (e.g. v5.0.0)
	s = strings.TrimPrefix(s, "v")

	// Capture git hash like .g88b1b13 or -g88b1b13
	var sha string
	reGit := regexp.MustCompile(`(?i)(?:^|[.\-])g([0-9a-f]{7,})`)
	if m := reGit.FindStringSubmatch(s); len(m) == 2 {
		sha = m[1]
		s = reGit.ReplaceAllString(s, "")
	}

	// Normalize separators for parsing
	s = strings.ReplaceAll(s, "-", ".")

	// Pre-release identifiers
	reBeta := regexp.MustCompile(`(?i)\.beta\.(\d+)`)
	s = reBeta.ReplaceAllString(s, "b$1")
	reAlpha := regexp.MustCompile(`(?i)\.alpha\.(\d+)`)
	s = reAlpha.ReplaceAllString(s, "a$1")
	reRC := regexp.MustCompile(`(?i)\.rc\.(\d+)`)
	s = reRC.ReplaceAllString(s, "rc$1")

	// Convert rN (commit count since tag) to devN
	reR := regexp.MustCompile(`(?i)(?:^|\.)r(\d+)(?:\.|$)`)
	if reR.MatchString(s) {
		// Replace occurrences of .rN. or .rN (end) with .devN.
		s = reR.ReplaceAllString(s, ".dev$1.")
		s = strings.TrimSuffix(s, ".")
	}

	// Handle CI format like 5.0.0-dev+<sha> or 5.0.0.dev+<sha>
	reDev := regexp.MustCompile(`^(\d+\.\d+\.\d+)[\.-]dev(?:\+([0-9A-Za-z]+))?$`)
	if reDev.MatchString(s) {
		m := reDev.FindStringSubmatch(s)
		base := m[1]
		if len(m) > 2 && m[2] != "" {
			s = fmt.Sprintf("%s.dev0+%s", base, m[2])
		} else {
			s = base + ".dev0"
		}
	}

	// Append local version with +g<sha> if available
	if sha != "" {
		if strings.Contains(s, "+") {
			s = s + ".g" + sha
		} else {
			s = s + "+g" + sha
		}
	}

	// Collapse duplicate dots and trim
	for strings.Contains(s, "..") {
		s = strings.ReplaceAll(s, "..", ".")
	}
	s = strings.TrimSuffix(s, ".")
	return s
}
