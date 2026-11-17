package client

import (
	"context"
	"fmt"
	"net/http"
	"time"
)

// Quit requests shutdown of the local backend after the caller has confirmed it.
func Quit(ctx context.Context) error {
	backend, err := BackendFor(ctx)
	if err != nil {
		return err
	}
	ctx, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()
	request, err := http.NewRequestWithContext(ctx, http.MethodPost, backend.HTTP("/api/quit"), nil)
	if err != nil {
		return fmt.Errorf("create quit request: %w", err)
	}
	request.Header.Set("Authorization", "Bearer "+backend.Key)
	response, err := http.DefaultClient.Do(request)
	if err != nil {
		return fmt.Errorf("quit System Bridge: %w", err)
	}
	defer func() { _ = response.Body.Close() }()
	if response.StatusCode != http.StatusNoContent {
		return fmt.Errorf("quit System Bridge: %s", response.Status)
	}
	return nil
}
