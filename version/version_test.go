package version

import (
	"testing"
)

func TestAPIVersion_Normalization(t *testing.T) {
	cases := []struct {
		name     string
		input    string
		expected string
	}{
		{
			name:     "CI tag with v prefix",
			input:    "v5.0.0",
			expected: "5.0.0",
		},
		{
			name:     "CI prerelease tag beta",
			input:    "v5.0.0-beta.8",
			expected: "5.0.0b8",
		},
		{
			name:     "Release package plain semantic version",
			input:    "5.0.0",
			expected: "5.0.0",
		},
		{
			name:     "CI dev build with plus sha",
			input:    "5.0.0-dev+9a1e6b4b",
			expected: "5.0.0.dev0+9a1e6b4b",
		},
		{
			name:     "Arch -git prerelease describe format",
			input:    "5.0.0.beta.8.r0.g88b1b13",
			expected: "5.0.0b8.dev0+g88b1b13",
		},
		{
			name:     "Arch -git stable describe format with commits",
			input:    "5.0.0.r123.gabcdef7",
			expected: "5.0.0.dev123+gabcdef7",
		},
		{
			name:     "RC prerelease tag",
			input:    "v5.0.0-rc.1",
			expected: "5.0.0rc1",
		},
		{
			name:     "Alpha prerelease tag",
			input:    "v5.0.0-alpha.3",
			expected: "5.0.0a3",
		},
		{
			name:     "Dot dev variant with plus sha",
			input:    "5.0.0.r1234.gb1b2345-1",
			expected: "5.0.0.dev1234.1+gb1b2345",
		},
	}

	orig := Version
	defer func() { Version = orig }()

	for _, tc := range cases {
		Version = tc.input
		if got := APIVersion(); got != tc.expected {
			t.Errorf("%s: APIVersion() = %q, want %q", tc.name, got, tc.expected)
		}
	}
}

func TestBuildCommit(t *testing.T) {
	cases := []struct {
		name     string
		input    string
		expected string
	}{
		{"Release tag", "v5.20.0", ""},
		{"Release package", "5.20.0", ""},
		{"Prerelease tag", "v5.0.0-beta.8", ""},
		{"CI dev build", "5.0.0-dev+9a1e6b4b", "9a1e6b4b"},
		{"Arch -git build", "5.19.1.r7013.g78f15ca", "78f15ca"},
		{"Arch -git prerelease build", "5.0.0.beta.8.r0.g88B1b13", "88b1b13"},
	}

	orig := Version
	defer func() { Version = orig }()

	for _, tc := range cases {
		Version = tc.input
		if got := BuildCommit(); got != tc.expected {
			t.Errorf("%s: BuildCommit() = %q, want %q", tc.name, got, tc.expected)
		}
	}
}

func TestIsNewerCommitAvailable(t *testing.T) {
	latest := "78f15ca0123456789abcdef0123456789abcdef0"
	if IsNewerCommitAvailable("78f15ca", latest) {
		t.Error("same commit reported as newer")
	}
	if !IsNewerCommitAvailable("023e2a0", latest) {
		t.Error("different commit not reported as newer")
	}
}

func TestDevVersion(t *testing.T) {
	commit := "bfe166d8ce7d74fcc2b04e37eb6fcad45dfb0dad"
	cases := []struct {
		name      string
		current   string
		latestTag string
		ahead     int
		behind    int
		expected  string
	}{
		{"Arch -git build", "5.21.2.r7060.g5221168", "5.21.1", 1, 0, "5.21.2.dev7061+gbfe166d"},
		{"Arch -git build after a release", "5.21.2.r7060.g5221168", "5.22.0", 3, 0, "5.22.1.dev7063+gbfe166d"},
		{"Arch -git build with local commits", "5.21.2.r7060.g5221168", "5.21.1", 2, 1, "5.21.2.dev7061+gbfe166d"},
		{"Arch -git build without the latest release", "5.21.2.r7060.g5221168", "", 1, 0, "5.21.2.dev7061+gbfe166d"},
		{"CI dev build", "5.21.1-dev+5221168", "5.21.1", 1, 0, "5.21.1.dev0+bfe166d"},
		{"CI dev build after a release", "5.21.1-dev+5221168", "5.22.0", 1, 0, "5.22.0.dev0+bfe166d"},
	}

	for _, tc := range cases {
		got := normalizeToPEP440(devVersion(tc.current, tc.latestTag, tc.ahead, tc.behind, commit))
		if got != tc.expected {
			t.Errorf("%s: devVersion() = %q, want %q", tc.name, got, tc.expected)
		}
	}
}

func TestIsNewerVersionAvailable(t *testing.T) {
	cases := []struct {
		name    string
		current string
		latest  string
		want    bool
	}{
		{"No prefix, newer available", "5.0.0", "5.0.1", true},
		{"Current newer than latest", "5.1.0", "5.0.9", false},
		{"Handles v prefix in current", "v5.0.0", "5.0.1", true},
		{"Handles v prefix in latest", "5.0.1", "v5.0.0", false},
	}

	for _, tc := range cases {
		if got := IsNewerVersionAvailable(tc.current, tc.latest); got != tc.want {
			t.Errorf("%s: got %v, want %v", tc.name, got, tc.want)
		}
	}
}
