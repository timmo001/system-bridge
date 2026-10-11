package utils

import "testing"

type decodeFixture struct {
	Value *float64 `json:"Value"`
}

func TestDecodeFirstJSON(t *testing.T) {
	one, ok := DecodeFirstJSON[decodeFixture](` {"Value": 1.5} `)
	if !ok || one.Value == nil || *one.Value != 1.5 {
		t.Fatalf("object: ok=%v value=%v", ok, one.Value)
	}
	first, ok := DecodeFirstJSON[decodeFixture](`[{"Value": 2}, {"Value": 3}]`)
	if !ok || first.Value == nil || *first.Value != 2 {
		t.Fatalf("array: ok=%v value=%v", ok, first.Value)
	}
	for _, bad := range []string{"", "   ", "[]", "not json", "[1, 2"} {
		if _, ok := DecodeFirstJSON[decodeFixture](bad); ok {
			t.Errorf("%q: expected failure", bad)
		}
	}
}
