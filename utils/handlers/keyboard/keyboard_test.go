package keyboard

import (
	"errors"
	"testing"
)

// test doubles capturing calls
type keyTapCall struct {
	key       string
	modifiers []any
}

func withRobotgoStubs(t *testing.T) (*[]keyTapCall, *[]string) {
	t.Helper()

	var keyCalls []keyTapCall
	var typeCalls []string

	// save originals
	origKeyTap := robotKeyTap
	origTypeStr := robotTypeStr

	robotKeyTap = func(key string, args ...any) error {
		keyCalls = append(keyCalls, keyTapCall{key: key, modifiers: args})
		return nil
	}
	robotTypeStr = func(text string, args ...int) {
		typeCalls = append(typeCalls, text)
	}

	t.Cleanup(func() {
		robotKeyTap = origKeyTap
		robotTypeStr = origTypeStr
	})

	return &keyCalls, &typeCalls
}

func TestSendKeypress_NoModifiers(t *testing.T) {
	keyCalls, _ := withRobotgoStubs(t)

	err := sendKeypress(KeypressData{Key: "a"})
	if err != nil {
		t.Fatalf("sendKeypress returned error: %v", err)
	}

	if len(*keyCalls) != 1 {
		t.Fatalf("expected 1 keyTap call, got %d", len(*keyCalls))
	}
	call := (*keyCalls)[0]
	if call.key != "a" {
		t.Errorf("expected key 'a', got %q", call.key)
	}
	if len(call.modifiers) != 0 {
		t.Errorf("expected no modifiers, got %v", call.modifiers)
	}
}

func TestSendKeypress_WithModifiers_Mapping(t *testing.T) {
	keyCalls, _ := withRobotgoStubs(t)

	err := sendKeypress(KeypressData{Key: "c", Modifiers: []string{"Shift", "CONTROL", "alt", "cmd"}})
	if err != nil {
		t.Fatalf("sendKeypress returned error: %v", err)
	}

	if len(*keyCalls) != 1 {
		t.Fatalf("expected 1 keyTap call, got %d", len(*keyCalls))
	}
	call := (*keyCalls)[0]
	if call.key != "c" {
		t.Errorf("expected key 'c', got %q", call.key)
	}
	// Expect normalized modifiers in order provided
	want := []any{"shift", "ctrl", "alt", "cmd"}
	if len(call.modifiers) != len(want) {
		t.Fatalf("expected %d modifiers, got %d (%v)", len(want), len(call.modifiers), call.modifiers)
	}
	for i := range want {
		if call.modifiers[i] != want[i] {
			t.Errorf("modifier[%d] = %v, want %v", i, call.modifiers[i], want[i])
		}
	}
}

func TestSendText(t *testing.T) {
	_, typeCalls := withRobotgoStubs(t)

	if err := sendText("Hello, World!"); err != nil {
		t.Fatalf("sendText returned error: %v", err)
	}
	if len(*typeCalls) != 1 {
		t.Fatalf("expected 1 TypeStr call, got %d", len(*typeCalls))
	}
	if (*typeCalls)[0] != "Hello, World!" {
		t.Errorf("typed %q, want %q", (*typeCalls)[0], "Hello, World!")
	}
}

// Ensure errors from robotgo surface back when present
func TestSendKeypress_PropagatesError(t *testing.T) {
	// save originals
	origKeyTap := robotKeyTap
	t.Cleanup(func() { robotKeyTap = origKeyTap })

	robotKeyTap = func(key string, args ...any) error { return errors.New("boom") }

	if err := sendKeypress(KeypressData{Key: "x"}); err == nil {
		t.Fatalf("expected error, got nil")
	}
}
