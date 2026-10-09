package discord

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/timmo001/system-bridge/utils"
)

// The redirect URI must be registered on the Discord application. RPC
// authorization never opens it, but the token exchange must send it.
const redirectURI = "http://localhost"

const tokenURL = "https://discord.com/api/oauth2/token"

// Credentials are the Discord application that System Bridge authorizes as.
// They live in their own file so the secret stays out of settings, which are
// logged and sent to the web client.
type Credentials struct {
	ClientID     string `json:"clientId"`
	ClientSecret string `json:"clientSecret"`
}

type oauthToken struct {
	AccessToken  string `json:"access_token"`
	RefreshToken string `json:"refresh_token"`
	ExpiresAt    int64  `json:"expires_at"`
}

func configFile(name string) (string, error) {
	dir, err := utils.GetConfigPath()
	if err != nil {
		return "", fmt.Errorf("could not get config path: %w", err)
	}
	return filepath.Join(dir, name), nil
}

// loadCredentials returns nil when the credentials file does not exist, so
// System Bridge runs without Discord until the user sets it up.
func loadCredentials() (*Credentials, error) {
	path, err := configFile("discord.json")
	if err != nil {
		return nil, err
	}
	b, err := os.ReadFile(path)
	if errors.Is(err, os.ErrNotExist) {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("failed to read %s: %w", path, err)
	}
	var c Credentials
	if err := json.Unmarshal(b, &c); err != nil {
		return nil, fmt.Errorf("failed to parse %s: %w", path, err)
	}
	if c.ClientID == "" || c.ClientSecret == "" {
		return nil, fmt.Errorf("%s needs both clientId and clientSecret", path)
	}
	return &c, nil
}

func loadToken() (*oauthToken, error) {
	path, err := configFile("discord-token.json")
	if err != nil {
		return nil, err
	}
	b, err := os.ReadFile(path)
	if errors.Is(err, os.ErrNotExist) {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("failed to read Discord token: %w", err)
	}
	var t oauthToken
	if err := json.Unmarshal(b, &t); err != nil {
		return nil, fmt.Errorf("failed to parse Discord token: %w", err)
	}
	return &t, nil
}

func saveToken(t *oauthToken) error {
	path, err := configFile("discord-token.json")
	if err != nil {
		return err
	}
	b, err := json.Marshal(t)
	if err != nil {
		return fmt.Errorf("failed to encode Discord token: %w", err)
	}
	if err := os.WriteFile(path, b, 0600); err != nil {
		return fmt.Errorf("failed to write Discord token: %w", err)
	}
	return nil
}

func clearToken() {
	if path, err := configFile("discord-token.json"); err == nil {
		_ = os.Remove(path)
	}
}

func (t *oauthToken) expired() bool {
	return time.Now().Unix() > t.ExpiresAt-60
}

func exchangeCode(ctx context.Context, creds *Credentials, code string) (*oauthToken, error) {
	return requestToken(ctx, url.Values{
		"client_id":     {creds.ClientID},
		"client_secret": {creds.ClientSecret},
		"grant_type":    {"authorization_code"},
		"code":          {code},
		"redirect_uri":  {redirectURI},
	})
}

func refreshToken(ctx context.Context, creds *Credentials, refresh string) (*oauthToken, error) {
	return requestToken(ctx, url.Values{
		"client_id":     {creds.ClientID},
		"client_secret": {creds.ClientSecret},
		"grant_type":    {"refresh_token"},
		"refresh_token": {refresh},
	})
}

func requestToken(ctx context.Context, form url.Values) (*oauthToken, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, tokenURL, strings.NewReader(form.Encode()))
	if err != nil {
		return nil, fmt.Errorf("failed to create token request: %w", err)
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("token request failed: %w", err)
	}
	defer func() { _ = resp.Body.Close() }()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read token response: %w", err)
	}
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("token request failed: %s: %s", resp.Status, body)
	}

	var r struct {
		AccessToken  string `json:"access_token"`
		RefreshToken string `json:"refresh_token"`
		ExpiresIn    int64  `json:"expires_in"`
	}
	if err := json.Unmarshal(body, &r); err != nil {
		return nil, fmt.Errorf("failed to parse token response: %w", err)
	}
	return &oauthToken{
		AccessToken:  r.AccessToken,
		RefreshToken: r.RefreshToken,
		ExpiresAt:    time.Now().Unix() + r.ExpiresIn,
	}, nil
}
