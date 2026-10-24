//go:build linux

package desktop

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/timmo001/system-bridge/types"
)

func TestParseOmarchyTargets(t *testing.T) {
	output := []byte(`target timmo.git
  function toggle(): void
  function issue(repo: string, number: int): string
target media
  function next(): string
`)
	assert.Equal(t, []types.OmarchyTarget{
		{Name: "media", Functions: []types.OmarchyFunction{
			{Name: "next", Arguments: []types.OmarchyArgument{}, Returns: "string"},
		}},
		{Name: "timmo.git", Functions: []types.OmarchyFunction{
			{Name: "issue", Arguments: []types.OmarchyArgument{{Name: "repo", Type: "string"}, {Name: "number", Type: "int"}}, Returns: "string"},
			{Name: "toggle", Arguments: []types.OmarchyArgument{}, Returns: "void"},
		}},
	}, parseOmarchyTargets(output))
}
