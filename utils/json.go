package utils

import (
	"encoding/json"
	"strings"
)

// DecodeFirstJSON decodes PowerShell's ConvertTo-Json output, which is a
// single object for one result and an array for several, and returns the
// first result. ok is false when there is none or it does not parse.
func DecodeFirstJSON[T any](s string) (T, bool) {
	var zero T
	s = strings.TrimSpace(s)
	if s == "" {
		return zero, false
	}
	if strings.HasPrefix(s, "[") {
		var many []T
		if err := json.Unmarshal([]byte(s), &many); err != nil || len(many) == 0 {
			return zero, false
		}
		return many[0], true
	}
	var one T
	if err := json.Unmarshal([]byte(s), &one); err != nil {
		return zero, false
	}
	return one, true
}
