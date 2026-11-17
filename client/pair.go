package client

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"time"
)

// PairingCode is a one-time pairing code and the link a QR code holds
type PairingCode struct {
	Code      string `json:"code"`
	Link      string `json:"link"`
	ExpiresAt string `json:"expiresAt"`
}

// PairCode asks the backend for a one-time pairing code. The web client
// opened with it, or another computer pairing with its link, trades it for a
// key of its own. The code is a credential, so never log it.
func PairCode(ctx context.Context) (PairingCode, error) {
	backend, err := BackendFor(ctx)
	if err != nil {
		return PairingCode{}, err
	}
	ctx, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()
	request, err := http.NewRequestWithContext(ctx, http.MethodPost, backend.HTTP("/api/pair/code"), nil)
	if err != nil {
		return PairingCode{}, fmt.Errorf("create pairing code request: %w", err)
	}
	request.Header.Set("Authorization", "Bearer "+backend.Key)
	response, err := http.DefaultClient.Do(request)
	if err != nil {
		return PairingCode{}, backend.Unreachable(err)
	}
	defer func() { _ = response.Body.Close() }()
	if response.StatusCode != http.StatusOK {
		return PairingCode{}, fmt.Errorf("make a pairing code: %s", response.Status)
	}
	var body PairingCode
	if err := json.NewDecoder(response.Body).Decode(&body); err != nil || body.Code == "" {
		return PairingCode{}, fmt.Errorf("make a pairing code: unexpected answer")
	}
	return body, nil
}
