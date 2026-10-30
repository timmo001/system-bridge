package utils

import (
	"os"
	"os/user"
	"path/filepath"
	"regexp"
	"runtime"
	"strings"
	"sync"
)

// minMaskedUserNameLength skips masking very short user names, which would
// otherwise mask parts of ordinary words
const minMaskedUserNameLength = 3

var userPathMasker = sync.OnceValue(newUserPathMasker)

type pathMasker struct {
	homes    []string
	userName *regexp.Regexp
}

func newUserPathMasker() pathMasker {
	var m pathMasker
	if home, err := os.UserHomeDir(); err == nil && home != "" && home != string(filepath.Separator) {
		m.homes = append(m.homes, home)
		if slashed := filepath.ToSlash(home); slashed != home {
			m.homes = append(m.homes, slashed)
		}
	}
	if current, err := user.Current(); err == nil {
		name := current.Username
		// Windows names the user as DOMAIN\user
		if i := strings.LastIndex(name, `\`); i >= 0 {
			name = name[i+1:]
		}
		if len(name) >= minMaskedUserNameLength {
			pattern := `\b` + regexp.QuoteMeta(name) + `\b`
			if runtime.GOOS == "windows" {
				pattern = `(?i)` + pattern
			}
			m.userName = regexp.MustCompile(pattern)
		}
	}
	return m
}

func (m pathMasker) mask(text string) string {
	for _, home := range m.homes {
		text = strings.ReplaceAll(text, home, "~")
	}
	if m.userName != nil {
		text = m.userName.ReplaceAllString(text, "<user>")
	}
	return text
}

// MaskUserPaths replaces the user's home directory with ~ and their user name
// with <user>, so text such as an error can be shared without them
func MaskUserPaths(text string) string {
	return userPathMasker().mask(text)
}
