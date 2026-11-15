// Package keys makes, checks and stores client keys, to Groundwork's Client
// keys spec: https://groundwork.timmo.dev/behavior (Client keys). A key is
// `<service>_<kind>_` + 43 base62 random characters + a 6 character base62
// CRC32 (IEEE) of everything before it. Only a key's SHA-256 is kept.
package keys

import (
	"crypto/rand"
	"crypto/sha256"
	"crypto/subtle"
	"encoding/hex"
	"fmt"
	"hash/crc32"
	"regexp"
	"strings"
)

const (
	// Service is the service name every key starts with
	Service = "system-bridge"
	// KindClient is the key kind of a client's own key
	KindClient = "client"
	// KindOwner is the key kind of the owner key
	KindOwner = "owner"

	alphabet       = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz"
	randomLength   = 43
	checksumLength = 6
)

var keyPattern = regexp.MustCompile(`^([a-z][0-9a-z-]*)_([a-z][0-9a-z-]*)_([0-9A-Za-z]{43})([0-9A-Za-z]{6})$`)

// Parsed is a key read into its parts
type Parsed struct {
	Service  string
	Kind     string
	Random   string
	Checksum string
}

func toBase62(value uint32, length int) string {
	text := ""
	for value > 0 {
		text = string(alphabet[value%62]) + text
		value /= 62
	}
	return strings.Repeat("0", max(length-len(text), 0)) + text
}

// checksum is the checksum for everything before it in a key
func checksum(body string) string {
	return toBase62(crc32.ChecksumIEEE([]byte(body)), checksumLength)
}

// randomBase62 is random base62 from the CSPRNG without modulo bias: bytes of
// 248 and over are thrown away, as 248 is the largest multiple of 62
func randomBase62(length int) (string, error) {
	text := make([]byte, 0, length)
	buffer := make([]byte, length*2)
	for len(text) < length {
		if _, err := rand.Read(buffer); err != nil {
			return "", err
		}
		for _, b := range buffer {
			if b < 248 && len(text) < length {
				text = append(text, alphabet[b%62])
			}
		}
	}
	return string(text), nil
}

// Generate makes a key of a kind, such as KindClient. Show it once and keep
// only its Hash.
func Generate(kind string) (string, error) {
	random, err := randomBase62(randomLength)
	if err != nil {
		return "", fmt.Errorf("failed to make a key: %w", err)
	}
	body := Service + "_" + kind + "_" + random
	return body + checksum(body), nil
}

// Parse reads a key into its parts, saying false when it isn't shaped as one
// or its checksum is wrong, so a mistyped key is turned away before any lookup
func Parse(text string) (Parsed, bool) {
	match := keyPattern.FindStringSubmatch(text)
	if match == nil {
		return Parsed{}, false
	}
	parsed := Parsed{Service: match[1], Kind: match[2], Random: match[3], Checksum: match[4]}
	if checksum(parsed.Service+"_"+parsed.Kind+"_"+parsed.Random) != parsed.Checksum {
		return Parsed{}, false
	}
	return parsed, true
}

// Hash is the lowercase hex SHA-256 of a key: the only form of it that is kept
func Hash(key string) string {
	sum := sha256.Sum256([]byte(key))
	return hex.EncodeToString(sum[:])
}

func equal(a, b string) bool {
	return subtle.ConstantTimeCompare([]byte(a), []byte(b)) == 1
}
