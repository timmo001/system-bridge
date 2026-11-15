package http

import (
	"fmt"
	"net/http"
)

// VersionHeader is the header a page of the web client sends to say which
// version it is.
const VersionHeader = "X-System-Bridge-Version"

// anyVersion are the paths open to a page of any version, so a client can
// always learn the backend's.
var anyVersion = map[string]bool{
	"/api/health": true,
}

// RequireVersion answers 426 to an API request from a page of another version
// than this backend's, so the page can move onto the version the backend
// embeds. A request that sends no version, such as a socket, media or an
// app's, isn't held to one.
func RequireVersion(version string, next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		client := r.Header.Get(VersionHeader)

		if client != "" && client != version && !anyVersion[r.URL.Path] {
			writeError(w, http.StatusUpgradeRequired, fmt.Sprintf(
				"This page is version %s, but System Bridge is %s. Reload to use the new version.",
				client, version,
			))

			return
		}

		next.ServeHTTP(w, r)
	})
}
