package http

import (
	"net/http"
	"net/http/httptest"
	"net/url"
	"os"
	"path/filepath"
	"strconv"
	"testing"
	"time"

	"github.com/timmo001/system-bridge/utils"
)

// The Python connector's media_file_url test pins the same value, so the two
// signers can't drift apart unnoticed.
func TestMediaFileSignature(t *testing.T) {
	const want = "71497c7265cabb467f6c272122b70929f6d9467f626b22169c2d946d48969eb2"
	if got := MediaFileSignature("abc123", "music", "song.mp3", 1700000000); got != want {
		t.Fatalf("got %s, want %s", got, want)
	}
}

func TestServeMediaFileDataHandlerAuth(t *testing.T) {
	home := t.TempDir()
	t.Setenv("HOME", home)
	t.Setenv("SYSTEM_BRIDGE_CONFIG_DIR", t.TempDir())
	musicDir := filepath.Join(home, "Music")
	if err := os.MkdirAll(musicDir, 0o755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(musicDir, "song.mp3"), []byte("audio"), 0o600); err != nil {
		t.Fatal(err)
	}
	token, err := utils.LoadToken()
	if err != nil {
		t.Fatal(err)
	}

	future := time.Now().Add(time.Hour).Unix()
	past := time.Now().Add(-time.Minute).Unix()
	signed := func(base, path string, expires int64) url.Values {
		return url.Values{
			"base":    {"music"},
			"path":    {"song.mp3"},
			"expires": {strconv.FormatInt(expires, 10)},
			"sig":     {MediaFileSignature(token, base, path, expires)},
		}
	}

	for _, test := range []struct {
		name   string
		query  url.Values
		status int
	}{
		{"valid signature", signed("music", "song.mp3", future), http.StatusOK},
		{"expired signature", signed("music", "song.mp3", past), http.StatusUnauthorized},
		{"signature for another path", signed("music", "other.mp3", future), http.StatusUnauthorized},
		{"signature for another base", signed("videos", "song.mp3", future), http.StatusUnauthorized},
		{"malformed expires", url.Values{
			"base": {"music"}, "path": {"song.mp3"}, "expires": {"soon"},
			"sig": {MediaFileSignature(token, "music", "song.mp3", future)},
		}, http.StatusUnauthorized},
		{"legacy token", url.Values{"base": {"music"}, "path": {"song.mp3"}, "token": {token}}, http.StatusOK},
		{"wrong legacy token", url.Values{"base": {"music"}, "path": {"song.mp3"}, "token": {"wrong"}}, http.StatusUnauthorized},
		{"no credentials", url.Values{"base": {"music"}, "path": {"song.mp3"}}, http.StatusUnauthorized},
	} {
		t.Run(test.name, func(t *testing.T) {
			request := httptest.NewRequest(http.MethodGet, "/api/media/file/data?"+test.query.Encode(), nil)
			response := httptest.NewRecorder()
			ServeMediaFileDataHandler(response, request)
			if response.Code != test.status {
				t.Fatalf("got status %d, want %d: %s", response.Code, test.status, response.Body.String())
			}
		})
	}
}
