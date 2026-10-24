package backend

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"testing/fstest"
)

func TestSPAFileServer(t *testing.T) {
	files := fstest.MapFS{
		"index.html":         {Data: []byte("<!doctype html><sb-app></sb-app>")},
		"icon.svg":           {Data: []byte("<svg></svg>")},
		"assets/app-abc.js":  {Data: []byte("console.log(1)")},
		"assets/app-abc.css": {Data: []byte(":root{}")},
	}
	handler := spaFileServer(files, "index.html")

	for _, test := range []struct {
		name, path, body, cache string
		status                  int
	}{
		{"root", "/", "<sb-app>", "no-cache", http.StatusOK},
		{"deep link is the index, not a redirect", "/data/cpu", "<sb-app>", "no-cache", http.StatusOK},
		{"deep link with a query", "/data/processes?sort=cpu&page=2", "<sb-app>", "no-cache", http.StatusOK},
		{"hashed asset is cached", "/assets/app-abc.js", "console.log", "public, max-age=31536000, immutable", http.StatusOK},
		{"other file", "/icon.svg", "<svg>", "no-cache", http.StatusOK},
		{"missing asset", "/assets/app-old.js", "", "", http.StatusNotFound},
		{"missing file", "/favicon.ico", "", "", http.StatusNotFound},
		{"unknown API path", "/api/unknown", "", "", http.StatusNotFound},
	} {
		t.Run(test.name, func(t *testing.T) {
			response := httptest.NewRecorder()
			handler(response, httptest.NewRequest(http.MethodGet, test.path, nil))

			if response.Code != test.status {
				t.Fatalf("got status %d, want %d", response.Code, test.status)
			}
			if test.body != "" && !strings.Contains(response.Body.String(), test.body) {
				t.Fatalf("got body %q, want it to contain %q", response.Body.String(), test.body)
			}
			if got := response.Header().Get("Cache-Control"); got != test.cache {
				t.Fatalf("got Cache-Control %q, want %q", got, test.cache)
			}
		})
	}
}
