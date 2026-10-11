package utils

import (
	"testing"
	"time"
)

func TestTTLValueCachesSuccessAndFailure(t *testing.T) {
	calls := 0
	c := &TTLValue[int]{TTL: time.Hour, FailTTL: time.Hour}

	v, ok := c.Get(func() (int, bool) { calls++; return 0, false })
	if ok || v != 0 || calls != 1 {
		t.Fatalf("first load: v=%d ok=%v calls=%d", v, ok, calls)
	}
	// A failure is remembered for FailTTL.
	_, ok = c.Get(func() (int, bool) { calls++; return 7, true })
	if ok || calls != 1 {
		t.Fatalf("failure not cached: ok=%v calls=%d", ok, calls)
	}

	c.Reset()
	v, ok = c.Get(func() (int, bool) { calls++; return 7, true })
	if !ok || v != 7 || calls != 2 {
		t.Fatalf("load after reset: v=%d ok=%v calls=%d", v, ok, calls)
	}
	v, ok = c.Get(func() (int, bool) { calls++; return 9, true })
	if !ok || v != 7 || calls != 2 {
		t.Fatalf("success not cached: v=%d ok=%v calls=%d", v, ok, calls)
	}
}

func TestTTLValueDoesNotCacheFailureWithoutFailTTL(t *testing.T) {
	calls := 0
	c := &TTLValue[string]{TTL: time.Hour}
	for range 2 {
		c.Get(func() (string, bool) { calls++; return "", false })
	}
	if calls != 2 {
		t.Fatalf("expected failures to be retried, calls=%d", calls)
	}
}
