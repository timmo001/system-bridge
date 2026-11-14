package push

import (
	"context"
	"log/slog"
	"time"

	"github.com/timmo001/system-bridge/version"
)

const (
	// updateCheckDelay is how long after startup the first check runs, so
	// startup isn't slowed and a restart loop doesn't hit GitHub
	updateCheckDelay = time.Minute
	// updateCheckEvery is how often to check for a release after that
	updateCheckEvery = 6 * time.Hour
)

// WatchUpdates pushes once for each new System Bridge release, until ctx
// ends. Development builds update from the dev branch, so they never push.
func WatchUpdates(ctx context.Context, store *Store) {
	if version.BuildCommit() != "" {
		return
	}
	wait := updateCheckDelay
	for {
		select {
		case <-ctx.Done():
			return
		case <-time.After(wait):
		}
		wait = updateCheckEvery

		latest, err := version.GetLatestVersion()
		if err != nil {
			slog.Debug("Failed to check for a release to push", "error", err)
			continue
		}
		if latest == "" || !version.IsNewerVersionAvailable(version.Version, latest) || !store.MarkUpdate(latest) {
			continue
		}
		store.Send(ctx, KindUpdates, Payload{
			Title: "System Bridge " + latest + " is out",
			Body:  "This computer has " + version.Version,
			Link:  "/whats-new",
			Tag:   "update",
		})
	}
}
