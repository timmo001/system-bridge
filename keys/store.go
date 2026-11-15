package keys

import (
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"os"
	"path/filepath"
	"sync"
	"time"
)

// OwnerID is the client ID of the owner key
const OwnerID = "owner"

// lastUsedGranularity is how often a key's last used time is written, so a
// busy client doesn't rewrite the file on every request
const lastUsedGranularity = time.Minute

// Record is what is kept for a client: who it is, its key's SHA-256 and never
// the key, its scopes and when it was made and last used
type Record struct {
	ID       string   `json:"id"`
	Name     string   `json:"name"`
	Kind     string   `json:"kind"`
	Hash     string   `json:"hash"`
	Scopes   []string `json:"scopes"`
	Created  string   `json:"created"`
	LastUsed string   `json:"lastUsed,omitempty"`
}

// Client is who a key is for. ID is kept by the client, so pairing again
// replaces its key rather than adding a second one.
type Client struct {
	ID   string `json:"id"`
	Name string `json:"name"`
	Kind string `json:"kind"`
}

// Info is a record as a list shows it, without its hash
type Info struct {
	ID       string   `json:"id"`
	Name     string   `json:"name"`
	Kind     string   `json:"kind"`
	Scopes   []string `json:"scopes"`
	Created  string   `json:"created"`
	LastUsed string   `json:"lastUsed,omitempty"`
}

// ErrNotFound is returned when removing a client that has no key
var ErrNotFound = errors.New("no key for that client")

// Store keeps the client records in a file only the service user can read. It
// reads the file again when another process, such as the command line, has
// changed it.
type Store struct {
	path string
	now  func() time.Time

	mu      sync.Mutex
	records []Record
	modTime time.Time
	size    int64
	loaded  bool
}

// Open makes a store for a file, which need not exist yet
func Open(path string) *Store {
	return &Store{path: path, now: time.Now}
}

func (s *Store) reload() error {
	info, err := os.Stat(s.path)
	if errors.Is(err, os.ErrNotExist) {
		s.records, s.loaded, s.modTime, s.size = nil, true, time.Time{}, 0
		return nil
	}
	if err != nil {
		return fmt.Errorf("failed to read the client keys: %w", err)
	}
	if s.loaded && info.ModTime().Equal(s.modTime) && info.Size() == s.size {
		return nil
	}
	raw, err := os.ReadFile(s.path)
	if err != nil {
		return fmt.Errorf("failed to read the client keys: %w", err)
	}
	var records []Record
	if len(raw) > 0 {
		if err := json.Unmarshal(raw, &records); err != nil {
			return fmt.Errorf("failed to parse the client keys: %w", err)
		}
	}
	s.records, s.loaded, s.modTime, s.size = records, true, info.ModTime(), info.Size()
	return nil
}

func (s *Store) save() error {
	if err := os.MkdirAll(filepath.Dir(s.path), 0o755); err != nil {
		return fmt.Errorf("failed to create the client keys directory: %w", err)
	}
	raw, err := json.MarshalIndent(s.records, "", "  ")
	if err != nil {
		return err
	}
	temp := s.path + ".tmp"
	if err := os.WriteFile(temp, raw, 0o600); err != nil {
		return fmt.Errorf("failed to write the client keys: %w", err)
	}
	if err := os.Rename(temp, s.path); err != nil {
		return fmt.Errorf("failed to write the client keys: %w", err)
	}
	if info, err := os.Stat(s.path); err == nil {
		s.modTime, s.size = info.ModTime(), info.Size()
	}
	return nil
}

func (s *Store) put(record Record) {
	for i, existing := range s.records {
		if existing.ID == record.ID {
			s.records[i] = record
			return
		}
	}
	s.records = append(s.records, record)
}

func (s *Store) create(client Client, kind string) (string, error) {
	key, err := Generate(kind)
	if err != nil {
		return "", err
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	if err := s.reload(); err != nil {
		return "", err
	}
	s.put(Record{
		ID:      client.ID,
		Name:    client.Name,
		Kind:    client.Kind,
		Hash:    Hash(key),
		Scopes:  []string{"all"},
		Created: s.now().UTC().Format(time.RFC3339),
	})
	if err := s.save(); err != nil {
		return "", err
	}
	return key, nil
}

// Create makes a key for a client and keeps its hash, replacing the client's
// key if it has one. Show the key once.
func (s *Store) Create(client Client) (string, error) {
	return s.create(client, KindClient)
}

// Authenticate finds the record a key belongs to. A key with a bad checksum
// is turned away before any lookup, and every record is compared in constant
// time, so the answer takes as long wherever the match is.
func (s *Store) Authenticate(key string) (Info, bool) {
	if _, ok := Parse(key); !ok {
		return Info{}, false
	}
	hash := Hash(key)

	s.mu.Lock()
	defer s.mu.Unlock()
	if err := s.reload(); err != nil {
		slog.Error("Failed to read the client keys", "error", err)
		return Info{}, false
	}
	found := -1
	for i, record := range s.records {
		if equal(record.Hash, hash) && found < 0 {
			found = i
		}
	}
	if found < 0 {
		return Info{}, false
	}
	record := s.records[found]
	now := s.now().UTC()
	if last, err := time.Parse(time.RFC3339, record.LastUsed); err != nil || now.Sub(last) >= lastUsedGranularity {
		s.records[found].LastUsed = now.Format(time.RFC3339)
		record = s.records[found]
		if err := s.save(); err != nil {
			slog.Error("Failed to record a key's last use", "error", err)
		}
	}
	return record.info(), true
}

func (r Record) info() Info {
	return Info{ID: r.ID, Name: r.Name, Kind: r.Kind, Scopes: r.Scopes, Created: r.Created, LastUsed: r.LastUsed}
}

// List is every client with a key
func (s *Store) List() ([]Info, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if err := s.reload(); err != nil {
		return nil, err
	}
	infos := make([]Info, 0, len(s.records))
	for _, record := range s.records {
		infos = append(infos, record.info())
	}
	return infos, nil
}

// Remove takes away a client's key
func (s *Store) Remove(id string) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	if err := s.reload(); err != nil {
		return err
	}
	for i, record := range s.records {
		if record.ID == id {
			s.records = append(s.records[:i], s.records[i+1:]...)
			return s.save()
		}
	}
	return ErrNotFound
}

// HasOwner says whether an owner key exists
func (s *Store) HasOwner() (bool, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if err := s.reload(); err != nil {
		return false, err
	}
	for _, record := range s.records {
		if record.ID == OwnerID {
			return true, nil
		}
	}
	return false, nil
}

// MakeOwner makes the owner key, replacing any there is, and writes it to
// keyPath for only the service user to read
func (s *Store) MakeOwner(keyPath string) error {
	key, err := s.create(Client{ID: OwnerID, Name: "Owner", Kind: KindOwner}, KindOwner)
	if err != nil {
		return err
	}
	if err := os.MkdirAll(filepath.Dir(keyPath), 0o755); err != nil {
		return fmt.Errorf("failed to create the owner key directory: %w", err)
	}
	if err := os.WriteFile(keyPath, []byte(key+"\n"), 0o600); err != nil {
		return fmt.Errorf("failed to write the owner key: %w", err)
	}
	return nil
}
