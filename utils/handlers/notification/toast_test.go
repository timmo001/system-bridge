package notification

import (
	"encoding/xml"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestBuildToastKeepsTextAsText(t *testing.T) {
	data := NotificationData{
		Title:   `$(Start-Process calc)]]><action content="x" arguments="y"/>`,
		Message: "\"@\n`whoami`",
		Buttons: []NotificationButton{
			{ID: "a&action=default", Label: `<b>"Snooze"</b>`},
		},
	}

	toast, err := buildToast(7, data)
	require.NoError(t, err)

	var decoded toastXML
	require.NoError(t, xml.Unmarshal([]byte(toast), &decoded))
	assert.Equal(t, []string{data.Title, data.Message}, decoded.Binding.Text)
	require.Len(t, decoded.Actions, 1, "the text adds no buttons")
	assert.Equal(t, data.Buttons[0].Label, decoded.Actions[0].Content)

	id, action, ok := parseActivationArguments(decoded.Actions[0].Arguments)
	require.True(t, ok)
	assert.Equal(t, uint32(7), id)
	assert.Equal(t, data.Buttons[0].ID, action)

	id, action, ok = parseActivationArguments(decoded.Launch)
	require.True(t, ok)
	assert.Equal(t, uint32(7), id)
	assert.Equal(t, DefaultAction, action)
}

func TestParseActivationArgumentsRejectsOthers(t *testing.T) {
	for _, arguments := range []string{"", "https://example.com", "id=x&action=default", "id=1"} {
		_, _, ok := parseActivationArguments(arguments)
		assert.False(t, ok, arguments)
	}
}
