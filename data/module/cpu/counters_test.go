package cpu

import "testing"

func TestExpandCounterPath(t *testing.T) {
	tests := []struct {
		path, instance, want string
	}{
		{`\Processor(*)\% DPC Time`, "0", `\Processor(0)\% DPC Time`},
		{`\Processor(*)\% DPC Time`, "_Total", `\Processor(_Total)\% DPC Time`},
		{`\Processor(_Total)\Interrupts/sec`, "_Total", `\Processor(_Total)\Interrupts/sec`},
		{`\System\Context Switches/sec`, "", `\System\Context Switches/sec`},
		{`\Power Meter(*)\Power`, "", `\Power Meter(*)\Power`},
	}
	for _, tt := range tests {
		if got := expandCounterPath(tt.path, tt.instance); got != tt.want {
			t.Errorf("expandCounterPath(%q, %q) = %q, want %q", tt.path, tt.instance, got, tt.want)
		}
	}
}

func TestCounterInstance(t *testing.T) {
	tests := map[string]string{
		`\Processor(0)\% DPC Time`:         "0",
		`\Processor(_Total)\% DPC Time`:    "_Total",
		`\\PC\Processor(1)\% DPC Time`:     "1",
		`\System\Context Switches/sec`:     "",
		`\\PC\System\Context Switches/sec`: "",
	}
	for path, want := range tests {
		if got := counterInstance(path); got != want {
			t.Errorf("counterInstance(%q) = %q, want %q", path, got, want)
		}
	}
}
