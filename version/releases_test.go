package version

import (
	"testing"
)

const releasesBody = `[
	{"tag_name": "5.29.0-beta.1", "prerelease": true},
	{"tag_name": "5.28.5", "name": "5.28.5", "body": "Newest"},
	{"tag_name": "5.28.4", "name": "", "body": "Middle"},
	{"tag_name": "5.28.3", "draft": true},
	{"tag_name": "v5.28.2", "name": "5.28.2", "body": "Oldest"}
]`

func TestParseReleases(t *testing.T) {
	type marked struct {
		version          string
		newer, installed bool
	}
	cases := []struct {
		name    string
		current string
		want    []marked
	}{
		{
			name:    "Release build in the list",
			current: "5.28.4",
			want:    []marked{{"5.28.5", true, false}, {"5.28.4", false, true}, {"5.28.2", false, false}},
		},
		{
			name:    "Release build with a v, against a tag with one",
			current: "v5.28.2",
			want:    []marked{{"5.28.5", true, false}, {"5.28.4", true, false}, {"5.28.2", false, true}},
		},
		{
			name:    "CI dev build after the newest release",
			current: "5.28.5-dev+abc1234",
			want:    []marked{{"5.28.5", false, false}, {"5.28.4", false, false}, {"5.28.2", false, false}},
		},
		{
			name:    "Arch -git build before the newest release",
			current: "5.28.5.r7060.g5221168",
			want:    []marked{{"5.28.5", false, false}, {"5.28.4", false, false}, {"5.28.2", false, false}},
		},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			releases, err := parseReleases([]byte(releasesBody), tc.current)
			if err != nil {
				t.Fatalf("parseReleases() error = %v", err)
			}
			if len(releases) != len(tc.want) {
				t.Fatalf("parseReleases() gave %d releases, want %d", len(releases), len(tc.want))
			}
			for i, want := range tc.want {
				got := releases[i]
				if got.Version != want.version || got.Newer != want.newer || got.Installed != want.installed {
					t.Errorf("release %d = {%s newer:%t installed:%t}, want {%s newer:%t installed:%t}",
						i, got.Version, got.Newer, got.Installed, want.version, want.newer, want.installed)
				}
			}
		})
	}

	releases, err := parseReleases([]byte(releasesBody), "5.28.5")
	if err != nil {
		t.Fatalf("parseReleases() error = %v", err)
	}
	if releases[1].Name != "5.28.4" {
		t.Errorf("a release without a name is named %q, want its version", releases[1].Name)
	}
}
