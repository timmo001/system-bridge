package cpu

import "testing"

func TestParseTypeperfCSV(t *testing.T) {
	out := "\"(PDH-CSV 4.0)\",\"\\\\PC\\Processor(0)\\% DPC Time\",\"\\\\PC\\Processor(1)\\% DPC Time\",\"\\\\PC\\Processor(_Total)\\% DPC Time\"\r\n" +
		"\"10/11/2026 10:00:00.000\",\" \",\" \",\" \"\r\n" +
		"\"10/11/2026 10:00:01.000\",\"0.500000\",\"1.500000\",\"1.000000\"\r\n" +
		"Exiting, please wait...\r\n"

	values, ok := parseTypeperfCSV(out)
	if !ok {
		t.Fatal("expected values")
	}
	want := map[string]float64{
		`\\PC\Processor(0)\% DPC Time`:      0.5,
		`\\PC\Processor(1)\% DPC Time`:      1.5,
		`\\PC\Processor(_Total)\% DPC Time`: 1.0,
	}
	if len(values) != len(want) {
		t.Fatalf("got %d values, want %d: %v", len(values), len(want), values)
	}
	for path, v := range want {
		if values[path] != v {
			t.Errorf("%s = %v, want %v", path, values[path], v)
		}
		if got := typeperfInstance(path); got != map[string]string{
			`\\PC\Processor(0)\% DPC Time`:      "0",
			`\\PC\Processor(1)\% DPC Time`:      "1",
			`\\PC\Processor(_Total)\% DPC Time`: "_Total",
		}[path] {
			t.Errorf("instance of %s = %q", path, got)
		}
	}
}

func TestParseTypeperfCSVRejectsEmptyOutput(t *testing.T) {
	if _, ok := parseTypeperfCSV(""); ok {
		t.Fatal("expected no values for empty output")
	}
	if _, ok := parseTypeperfCSV("Error: No valid counters.\r\n"); ok {
		t.Fatal("expected no values for an error message")
	}
}

func TestTypeperfInstanceWithoutInstance(t *testing.T) {
	if got := typeperfInstance(`\\PC\System\Context Switches/sec`); got != "" {
		t.Fatalf("got %q, want empty", got)
	}
}
