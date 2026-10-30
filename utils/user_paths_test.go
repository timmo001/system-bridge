package utils

import (
	"regexp"
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestPathMaskerMask(t *testing.T) {
	m := pathMasker{
		homes:    []string{"/home/alice"},
		userName: regexp.MustCompile(`\balice\b`),
	}

	tests := []struct {
		name string
		text string
		want string
	}{
		{"home directory", "open /home/alice/.config/x: permission denied", "open ~/.config/x: permission denied"},
		{"user name elsewhere", "unit home-alice-private.mount failed", "unit home-<user>-private.mount failed"},
		{"part of a word", "malice and aliceblue", "malice and aliceblue"},
		{"nothing to mask", "failed to get GPU info", "failed to get GPU info"},
	}
	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			assert.Equal(t, tc.want, m.mask(tc.text))
		})
	}
}
