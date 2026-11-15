package keys

import (
	"encoding/json"
	"hash/crc32"
	"os"
	"testing"
)

// testdata/test-vectors.json is a copy of Groundwork's
// packages/auth/test-vectors.json, shared by every implementation of the
// client keys spec: https://github.com/timmo001/groundwork/blob/main/packages/auth/test-vectors.json
type vectors struct {
	CRC32Check struct {
		Input string `json:"input"`
		CRC32 uint32 `json:"crc32"`
	} `json:"crc32Check"`
	Valid []struct {
		Key      string `json:"key"`
		Service  string `json:"service"`
		Kind     string `json:"kind"`
		Random   string `json:"random"`
		CRC32    uint32 `json:"crc32"`
		Checksum string `json:"checksum"`
		SHA256   string `json:"sha256"`
	} `json:"valid"`
	Invalid []struct {
		Key    string `json:"key"`
		Reason string `json:"reason"`
	} `json:"invalid"`
}

func loadVectors(t *testing.T) vectors {
	t.Helper()
	raw, err := os.ReadFile("testdata/test-vectors.json")
	if err != nil {
		t.Fatal(err)
	}
	var v vectors
	if err := json.Unmarshal(raw, &v); err != nil {
		t.Fatal(err)
	}
	return v
}

func TestVectors(t *testing.T) {
	v := loadVectors(t)

	if got := crc32.ChecksumIEEE([]byte(v.CRC32Check.Input)); got != v.CRC32Check.CRC32 {
		t.Fatalf("crc32 = %d, want %d", got, v.CRC32Check.CRC32)
	}
	for _, valid := range v.Valid {
		parsed, ok := Parse(valid.Key)
		if !ok {
			t.Errorf("%s: rejected", valid.Key)
			continue
		}
		if parsed.Service != valid.Service || parsed.Kind != valid.Kind || parsed.Random != valid.Random || parsed.Checksum != valid.Checksum {
			t.Errorf("%s: parsed as %+v", valid.Key, parsed)
		}
		if got := Hash(valid.Key); got != valid.SHA256 {
			t.Errorf("%s: hash %s, want %s", valid.Key, got, valid.SHA256)
		}
		body := valid.Key[:len(valid.Key)-checksumLength]
		if got := crc32.ChecksumIEEE([]byte(body)); got != valid.CRC32 {
			t.Errorf("%s: crc32 %d, want %d", valid.Key, got, valid.CRC32)
		}
	}
	for _, invalid := range v.Invalid {
		if _, ok := Parse(invalid.Key); ok {
			t.Errorf("%s: accepted (%s)", invalid.Key, invalid.Reason)
		}
	}
}

func TestGenerate(t *testing.T) {
	key, err := Generate(KindClient)
	if err != nil {
		t.Fatal(err)
	}
	parsed, ok := Parse(key)
	if !ok || parsed.Service != Service || parsed.Kind != KindClient {
		t.Fatalf("generated key %q does not parse", key)
	}
}
