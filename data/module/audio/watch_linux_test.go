//go:build linux

package audio

import "testing"

func TestRelevantEvent(t *testing.T) {
	tests := []struct {
		line string
		want bool
	}{
		{"Event 'change' on sink #42", true},
		{"Event 'change' on source #7", true},
		{"Event 'new' on card #3", true},
		{"Event 'change' on server #4294967295", true},
		{"Event 'change' on sink-input #120", true},
		{"Event 'remove' on source-output #9", false},
		{"Event 'new' on client #300", false},
		{"", false},
	}
	for _, tt := range tests {
		if got := relevantEvent(tt.line); got != tt.want {
			t.Errorf("relevantEvent(%q) = %v, want %v", tt.line, got, tt.want)
		}
	}
}
