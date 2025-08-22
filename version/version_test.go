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
