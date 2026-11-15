package keys

import (
	"errors"
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"regexp"
	"strings"

	"github.com/timmo001/system-bridge/utils"
)

var bearerPattern = regexp.MustCompile(`(?i)^Bearer[ \t]+(\S+)[ \t]*$`)

// ReadBearer is the key in an Authorization: Bearer header, or "" when there
// is none or it uses another scheme
func ReadBearer(r *http.Request) string {
	match := bearerPattern.FindStringSubmatch(r.Header.Get("Authorization"))
	if match == nil {
		return ""
	}
	return match[1]
}

// Auth says whether a request, or a key, may use the backend. A client key
// is what a client sends. The shared token is the one every client used before
// keys, kept only until clients have moved onto their own.
type Auth struct {
	// Shared is the old shared token
	Shared string
	// Store is where the client keys are
	Store *Store
}

// Key says whether a key is one of the client keys
func (a *Auth) Key(key string) bool {
	if a == nil || a.Store == nil {
		return false
	}
	_, ok := a.Store.Authenticate(key)
	return ok
}

// SharedToken says whether a token is the old shared token
func (a *Auth) SharedToken(token string) bool {
	return a != nil && a.Shared != "" && equal(token, a.Shared)
}

// Valid says whether a request carries a client key as Authorization: Bearer
func (a *Auth) Valid(r *http.Request) bool {
	return a.Key(ReadBearer(r))
}

// ValidOrShared is Valid, also accepting the old shared token as X-API-Token,
// the older token header or Authorization: Bearer
func (a *Auth) ValidOrShared(r *http.Request) bool {
	if a.Valid(r) {
		return true
	}
	given := r.Header.Get("X-API-Token")
	if given == "" {
		given = r.Header.Get("token")
	}
	if given == "" {
		given = ReadBearer(r)
	}
	return a.SharedToken(given)
}

// StorePath is the file the client keys are kept in
func StorePath() (string, error) {
	dir, err := utils.GetConfigPath()
	if err != nil {
		return "", fmt.Errorf("could not get config path: %w", err)
	}
	return filepath.Join(dir, "keys.json"), nil
}

// OwnerKeyPath is the file the owner key is written to
func OwnerKeyPath() (string, error) {
	dir, err := utils.GetConfigPath()
	if err != nil {
		return "", fmt.Errorf("could not get config path: %w", err)
	}
	return filepath.Join(dir, "owner-key"), nil
}

// LoadOwnerKey reads the owner key, which the CLI signs in with on this host
func LoadOwnerKey() (string, error) {
	path, err := OwnerKeyPath()
	if err != nil {
		return "", err
	}
	raw, err := os.ReadFile(path)
	if errors.Is(err, os.ErrNotExist) {
		return "", fmt.Errorf("no owner key at %s: start System Bridge once to make it, or run system-bridge client key owner", path)
	}
	if err != nil {
		return "", fmt.Errorf("failed to read the owner key: %w", err)
	}
	return strings.TrimSpace(string(raw)), nil
}

// OpenDefault opens the store in the config directory
func OpenDefault() (*Store, error) {
	path, err := StorePath()
	if err != nil {
		return nil, err
	}
	return Open(path), nil
}
