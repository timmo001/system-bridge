package version

import (
	"encoding/json"
	"fmt"
	"log/slog"
	"regexp"
	"strconv"
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

	// DevBranchURL is the URL to check for the latest commit on the development branch
	DevBranchURL = "https://api.github.com/repos/timmo001/system-bridge/branches/dev"

	// compareUserURL is the base of the URL showing the user the commits since their build
	compareUserURL = "https://github.com/timmo001/system-bridge/compare/"

	// reBuildCommit matches the commit a development build was made from, in
	// the Arch -git (.g<sha>) or CI (-dev+<sha>) version formats
	reBuildCommit = regexp.MustCompile(`(?i)(?:[.\-]g|-dev\+)([0-9a-f]{7,})`)

	// reArchDevVersion matches the Arch -git version format, capturing the
	// base version, any prerelease part and the commit count
	reArchDevVersion = regexp.MustCompile(`(?i)^v?(\d+\.\d+\.\d+)(.*?)\.r(\d+)\.g[0-9a-f]{7,}$`)

	// reCIDevVersion matches the CI version format, capturing the tag
	reCIDevVersion = regexp.MustCompile(`(?i)^v?(\d+\.\d+\.\d+[^+]*?)-dev\+[0-9a-f]{7,}$`)

	// compareAPIURL is the base of the URL comparing two commits
	compareAPIURL = "https://api.github.com/repos/timmo001/system-bridge/compare/"

	// docsBaseURL is the documentation site root. It is used to build the
	// per-surface documentation links below and is not linked directly.
	docsBaseURL = "https://system-bridge.timmo.dev"

	// DocsURL is the documentation landing page (used by the system tray).
	DocsURL = docsBaseURL + "/overview"

	// DocsCLIURL is the CLI documentation page (used by the CLI help and version output).
	DocsCLIURL = docsBaseURL + "/using/cli"

	// DocsMCPURL is the MCP server documentation page (used by the MCP server instructions).
	DocsMCPURL = docsBaseURL + "/api/mcp"

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

	return version, nil
}

// BuildCommit returns the commit a development build was made from, or an
// empty string for a release build
func BuildCommit() string {
	if m := reBuildCommit.FindStringSubmatch(Version); len(m) == 2 {
		return strings.ToLower(m[1])
	}
	return ""
}

// GetLatestCommit fetches the latest commit on the development branch from GitHub with caching
func GetLatestCommit() (string, error) {
	body, err := client.Get(DevBranchURL)
	if err != nil {
		return "", fmt.Errorf("failed to fetch latest commit: %v", err)
	}

	var branch struct {
		Commit struct {
			SHA string `json:"sha"`
		} `json:"commit"`
	}
	if err := json.Unmarshal(body, &branch); err != nil {
		return "", fmt.Errorf("failed to parse response: %v", err)
	}
	if branch.Commit.SHA == "" {
		return "", fmt.Errorf("response has no commit")
	}

	return strings.ToLower(branch.Commit.SHA), nil
}

// IsNewerCommitAvailable checks if the latest commit differs from the one a
// development build was made from. The build commit may be abbreviated.
func IsNewerCommitAvailable(buildCommit, latestCommit string) bool {
	return !strings.HasPrefix(latestCommit, buildCommit)
}

// compareCommits fetches how many commits head is ahead of and behind base
func compareCommits(base, head string) (ahead, behind int, err error) {
	body, err := client.Get(compareAPIURL + base + "..." + head)
	if err != nil {
		return 0, 0, fmt.Errorf("failed to compare commits: %v", err)
	}

	var comparison struct {
		AheadBy  int `json:"ahead_by"`
		BehindBy int `json:"behind_by"`
	}
	if err := json.Unmarshal(body, &comparison); err != nil {
		return 0, 0, fmt.Errorf("failed to parse response: %v", err)
	}

	return comparison.AheadBy, comparison.BehindBy, nil
}

// GetLatestDevVersion returns the version a development build of the latest
// commit on the dev branch would have, in the same format as this build, and
// whether that commit is newer than the one this build was made from
func GetLatestDevVersion(buildCommit string) (string, bool, error) {
	latestCommit, err := GetLatestCommit()
	if err != nil {
		return "", false, err
	}
	if !IsNewerCommitAvailable(buildCommit, latestCommit) {
		return APIVersion(), false, nil
	}

	ahead, behind, err := compareCommits(buildCommit, latestCommit)
	if err != nil {
		return "", false, err
	}
	if ahead == 0 {
		// This build has commits dev doesn't, and dev has nothing new
		return APIVersion(), false, nil
	}

	latestTag, err := GetLatestVersion()
	if err != nil {
		slog.Warn("Failed to get latest version", "error", err)
		latestTag = ""
	}

	return normalizeToPEP440(devVersion(Version, latestTag, ahead, behind, latestCommit)), true, nil
}

// devVersion builds the version of a development build of commit, which is
// ahead and behind commits from the build with version current, after the
// release latestTag. It follows current's format: the Arch -git package's
// <next patch>.r<commit count>.g<sha>, or the CI build's <tag>-dev+<sha>.
func devVersion(current, latestTag string, ahead, behind int, commit string) string {
	sha := commit[:min(7, len(commit))]

	if m := reArchDevVersion.FindStringSubmatch(current); m != nil {
		base, pre := m[1], m[2]
		count, _ := strconv.Atoi(m[3])
		// The package's version is the patch after the last tag
		if next := nextPatch(latestTag); next != "" && IsNewerVersionAvailable(base, next) {
			base, pre = next, ""
		}
		return fmt.Sprintf("%s%s.r%d.g%s", base, pre, count+ahead-behind, sha)
	}

	if m := reCIDevVersion.FindStringSubmatch(current); m != nil {
		tag := m[1]
		if latest := strings.TrimPrefix(latestTag, "v"); latest != "" && IsNewerVersionAvailable(tag, latest) {
			tag = latest
		}
		return fmt.Sprintf("%s-dev+%s", tag, sha)
	}

	return sha
}

// nextPatch returns the version after tag's patch, or an empty string when
// tag isn't a version
func nextPatch(tag string) string {
	var major, minor, patch int
	if _, err := fmt.Sscanf(strings.TrimPrefix(tag, "v"), "%d.%d.%d", &major, &minor, &patch); err != nil {
		return ""
	}
	return fmt.Sprintf("%d.%d.%d", major, minor, patch+1)
}

// CompareUserURL returns the URL showing the user the commits since their build
func CompareUserURL(buildCommit string) string {
	return compareUserURL + buildCommit + "...dev"
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
