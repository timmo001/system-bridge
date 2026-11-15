package client

import (
	"context"
	"fmt"
	"net/http"
	"time"

	"github.com/timmo001/system-bridge/keys"
	"github.com/timmo001/system-bridge/utils"
)

// Quit requests shutdown of the local backend after the caller has confirmed it.
func Quit(ctx context.Context) error {
	key, err := keys.LoadOwnerKey()
	if err != nil {
		return err
	}
	ctx, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()
	request, err := http.NewRequestWithContext(ctx, http.MethodPost, fmt.Sprintf("http://127.0.0.1:%d/api/quit", utils.GetPort()), nil)
	if err != nil {
		return fmt.Errorf("create quit request: %w", err)
	}
	request.Header.Set("Authorization", "Bearer "+key)
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
