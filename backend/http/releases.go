package http

import (
	"log/slog"
	"net/http"

	"github.com/timmo001/system-bridge/version"
)

// releasesResponse is what GET /api/releases answers
type releasesResponse struct {
	// Version is this build's version
	Version  string            `json:"version"`
	Releases []version.Release `json:"releases"`
	// More is the page listing every release
	More string `json:"more"`
}

// ReleasesHandler answers the newest releases and their notes, for the web
// client's What's new page
func ReleasesHandler(token string) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			w.Header().Set("Allow", http.MethodGet)
			writeError(w, http.StatusMethodNotAllowed, "Method not allowed")
			return
		}
		if !TokenValid(r, token) {
			writeError(w, http.StatusUnauthorized, "Invalid API token")
			return
		}
		releases, err := version.GetReleases()
		if err != nil {
			slog.Warn("Failed to get releases", "error", err)
			writeError(w, http.StatusBadGateway, "Couldn't get the release notes from GitHub")
			return
		}
		writeJSON(w, http.StatusOK, releasesResponse{
			Version:  version.APIVersion(),
			Releases: releases,
			More:     version.ReleasesUserURL,
		})
	}
}
