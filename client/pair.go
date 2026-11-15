package client

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"github.com/timmo001/system-bridge/keys"
	"github.com/timmo001/system-bridge/utils"
)

// PairCode asks the local backend for a one-time pairing code, signed in
// with the owner key. The web client opened with it trades it for a key of
// its own. The code is a credential, so never log it.
func PairCode(ctx context.Context) (string, error) {
	key, err := keys.LoadOwnerKey()
	if err != nil {
		return "", err
	}
	ctx, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()
	request, err := http.NewRequestWithContext(ctx, http.MethodPost, fmt.Sprintf("http://127.0.0.1:%d/api/pair/code", utils.GetPort()), nil)
	if err != nil {
		return "", fmt.Errorf("create pairing code request: %w", err)
	}
	request.Header.Set("Authorization", "Bearer "+key)
	response, err := http.DefaultClient.Do(request)
	if err != nil {
		return "", fmt.Errorf("could not reach the System Bridge backend (is it running?): %w", err)
	}
	defer func() { _ = response.Body.Close() }()
	if response.StatusCode != http.StatusOK {
		return "", fmt.Errorf("make a pairing code: %s", response.Status)
	}
	var body struct {
		Code string `json:"code"`
	}
	if err := json.NewDecoder(response.Body).Decode(&body); err != nil || body.Code == "" {
		return "", fmt.Errorf("make a pairing code: unexpected answer")
	}
	return body.Code, nil
}
