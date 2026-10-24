package discord

import (
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"regexp"
	"strings"

	"github.com/timmo001/system-bridge/types"
)

// Setup is how far Discord is set up, for a client's setup page. It never
// includes the client secret.
type Setup struct {
	// Configured is true once valid credentials are saved.
	Configured bool `json:"configured"`
	// ClientID is the saved application's client ID, or empty.
	ClientID string `json:"clientId"`
	// RedirectURI must be registered on the Discord application.
	RedirectURI string `json:"redirectUri"`
	// Running is true when the Discord desktop app can be reached.
	Running bool `json:"running"`
	// Connected and Authenticated mirror the discord data module.
	Connected     bool `json:"connected"`
	Authenticated bool `json:"authenticated"`
	// Error is the latest problem with the credentials or the session, or
	// empty.
	Error string `json:"error"`
}

// A client ID is a Discord snowflake.
var clientIDPattern = regexp.MustCompile(`^[0-9]{15,22}$`)

// wake makes Run check the credentials now instead of after its delay.
var wake = make(chan struct{}, 1)

// reportError puts why the session failed in the discord data module, so
// clients see it as it happens.
func reportError(err error) {
	message := err.Error()
	updateState(func(d *types.DiscordData) { d.Error = &message })
}

// GetSetup reports how far Discord is set up.
func GetSetup() Setup {
	setup := Setup{RedirectURI: redirectURI}

	creds, err := loadCredentials()
	switch {
	case err != nil:
		setup.Error = err.Error()
	case creds != nil:
		setup.Configured = true
		setup.ClientID = creds.ClientID
	}

	d := State()
	setup.Connected = d.Connected
	setup.Authenticated = d.Authenticated
	setup.Running = d.Connected || socketAvailable()

	if setup.Error == "" && d.Error != nil {
		setup.Error = *d.Error
	}

	return setup
}

// SaveCredentials checks and stores the Discord application to authorize as,
// then connects straight away. A different application needs authorizing
// again, so its stored token is dropped.
func SaveCredentials(c Credentials) error {
	c.ClientID = strings.TrimSpace(c.ClientID)
	c.ClientSecret = strings.TrimSpace(c.ClientSecret)

	if !clientIDPattern.MatchString(c.ClientID) {
		return errors.New("the client ID should be the long number from the OAuth2 page")
	}
	if c.ClientSecret == "" || strings.ContainsAny(c.ClientSecret, " \t\n") {
		return errors.New("the client secret is missing or has spaces in it")
	}

	path, err := configFile("discord.json")
	if err != nil {
		return err
	}

	previous, _ := loadCredentials()
	changed := previous == nil || *previous != c
	if previous != nil && previous.ClientID != c.ClientID {
		clearToken()
	}

	b, err := json.Marshal(c)
	if err != nil {
		return fmt.Errorf("failed to encode Discord credentials: %w", err)
	}
	if err := os.WriteFile(path, b, 0600); err != nil {
		return fmt.Errorf("failed to write Discord credentials: %w", err)
	}

	// The last attempt's error is about the old credentials. Updating the
	// state also brings the module into being for a first setup
	updateState(func(d *types.DiscordData) { d.Error = nil })

	// A session using the old credentials ends, and Run starts a new one
	if changed {
		mu.Lock()
		conn := liveConn
		mu.Unlock()
		if conn != nil {
			_ = conn.Close()
		}
	}

	select {
	case wake <- struct{}{}:
	default:
	}

	return nil
}
