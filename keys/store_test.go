package keys

import (
	"path/filepath"
	"testing"
)

func TestStore(t *testing.T) {
	store := Open(filepath.Join(t.TempDir(), "keys.json"))
	client := Client{ID: "phone", Name: "Pixel", Kind: "android"}

	first, err := store.Create(client)
	if err != nil {
		t.Fatal(err)
	}
	if info, ok := store.Authenticate(first); !ok || info.ID != "phone" || info.LastUsed == "" {
		t.Fatalf("authenticate: %+v %v", info, ok)
	}
	if _, ok := store.Authenticate(first[:len(first)-1] + "0"); ok {
		t.Error("a key with a bad checksum was accepted")
	}

	second, err := store.Create(client)
	if err != nil {
		t.Fatal(err)
	}
	if _, ok := store.Authenticate(first); ok {
		t.Error("pairing again should replace the client's key")
	}
	if _, ok := store.Authenticate(second); !ok {
		t.Error("the new key was rejected")
	}
	if infos, _ := store.List(); len(infos) != 1 {
		t.Errorf("got %d clients, want 1", len(infos))
	}

	if err := store.Remove("phone"); err != nil {
		t.Fatal(err)
	}
	if _, ok := store.Authenticate(second); ok {
		t.Error("a removed key was accepted")
	}
}
