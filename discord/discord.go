// Package discord connects to the local Discord client over its RPC IPC socket.
// It keeps the voice settings in sync and changes them on request.
package discord

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"net"
	"sync"
	"time"

	"github.com/google/uuid"
	"github.com/timmo001/system-bridge/types"
)

const (
	connectRetryDelay     = 5 * time.Second
	credentialsRetryDelay = 30 * time.Second
	// A failed authorization means the user dismissed the prompt or the
	// credentials are wrong. Wait longer so Discord does not prompt repeatedly.
	authRetryDelay = 5 * time.Minute

	readyTimeout = 10 * time.Second
	rpcTimeout   = 10 * time.Second
	// AUTHORIZE waits for the user to approve a prompt in Discord.
	authorizeTimeout = 2 * time.Minute
)

var (
	ErrNotConnected  = errors.New("not connected to Discord")
	ErrInvalidAction = errors.New("invalid Discord action")
	ErrInvalidValue  = errors.New("invalid value for Discord action")

	errNoSocket = errors.New("no Discord socket")
	errAuth     = errors.New("discord authorization failed")
	// errRejected means Discord answered and refused the request, as opposed to
	// a timeout or a dropped connection.
	errRejected = errors.New("discord rejected the request")
)

var (
	mu       sync.Mutex
	current  *session
	state    types.DiscordData
	onUpdate func(types.DiscordData)
)

// State returns the last known Discord state.
func State() types.DiscordData {
	mu.Lock()
	defer mu.Unlock()
	return state
}

// Run keeps a connection to Discord open until ctx is done. It does nothing
// until the credentials file exists. update receives every state change.
func Run(ctx context.Context, update func(types.DiscordData)) {
	mu.Lock()
	onUpdate = update
	mu.Unlock()

	lastErr := ""
	for {
		wait := connectRetryDelay
		creds, err := loadCredentials()
		switch {
		case err != nil:
			if err.Error() != lastErr {
				slog.Warn("Invalid Discord credentials", "error", err)
				lastErr = err.Error()
			}
			wait = credentialsRetryDelay
		case creds == nil:
			wait = credentialsRetryDelay
		default:
			lastErr = ""
			err := runSession(ctx, creds)
			switch {
			case ctx.Err() != nil:
				return
			case errors.Is(err, errNoSocket):
				slog.Debug("Discord is not running")
			case errors.Is(err, errAuth):
				slog.Warn("Discord session ended", "error", err)
				wait = authRetryDelay
			case err != nil:
				slog.Warn("Discord session ended", "error", err)
			}
		}

		select {
		case <-ctx.Done():
			return
		case <-time.After(wait):
		}
	}
}

func runSession(ctx context.Context, creds *Credentials) error {
	conn, err := dial()
	if err != nil {
		return fmt.Errorf("%w: %w", errNoSocket, err)
	}
	s := newSession(conn)
	defer func() {
		_ = conn.Close()
		mu.Lock()
		current = nil
		mu.Unlock()
		updateState(func(d *types.DiscordData) { *d = types.DiscordData{} })
	}()
	stop := context.AfterFunc(ctx, func() { _ = conn.Close() })
	defer stop()

	go s.readLoop()

	if err := s.send(opHandshake, map[string]any{"v": 1, "client_id": creds.ClientID}); err != nil {
		return err
	}
	select {
	case <-s.ready:
	case <-s.done:
		return s.err
	case <-time.After(readyTimeout):
		return errors.New("timed out waiting for Discord READY")
	}
	slog.Info("Connected to Discord")
	updateState(func(d *types.DiscordData) { d.Connected = true })

	if err := authenticate(ctx, s, creds); err != nil {
		return err
	}

	voice, err := s.call(ctx, "GET_VOICE_SETTINGS", nil, "", rpcTimeout)
	if err != nil {
		return err
	}
	applyVoice(voice)
	if _, err := s.call(ctx, "SUBSCRIBE", nil, "VOICE_SETTINGS_UPDATE", rpcTimeout); err != nil {
		return err
	}

	mu.Lock()
	current = s
	mu.Unlock()
	slog.Info("Authenticated with Discord")
	updateState(func(d *types.DiscordData) { d.Authenticated = true })

	<-s.done
	return s.err
}

func authenticate(ctx context.Context, s *session, creds *Credentials) error {
	tok, err := loadToken()
	if err != nil {
		slog.Warn("Ignoring stored Discord token", "error", err)
		tok = nil
	}
	// Only a rejection from Discord means the stored token is bad. Other
	// failures return without errAuth, so Run reconnects soon and keeps the token.
	if tok != nil && tok.expired() {
		refreshed, err := refreshToken(ctx, creds, tok.RefreshToken)
		switch {
		case errors.Is(err, errRejected):
			slog.Info("Discord rejected the token refresh, authorizing again", "error", err)
			tok = nil
		case err != nil:
			return fmt.Errorf("failed to refresh Discord token: %w", err)
		default:
			tok = refreshed
			if err := saveToken(tok); err != nil {
				slog.Warn("Failed to save Discord token", "error", err)
			}
		}
	}
	if tok != nil {
		_, err := s.call(ctx, "AUTHENTICATE", map[string]any{"access_token": tok.AccessToken}, "", rpcTimeout)
		if err == nil {
			return nil
		}
		if !errors.Is(err, errRejected) {
			return err
		}
		slog.Info("Discord rejected the stored token, authorizing again", "error", err)
		clearToken()
	}

	if err := authorize(ctx, s, creds); err != nil {
		return fmt.Errorf("%w: %w", errAuth, err)
	}
	return nil
}

// authorize shows the Discord approval prompt and stores the new token.
func authorize(ctx context.Context, s *session, creds *Credentials) error {
	slog.Info("Requesting Discord authorization. Approve the prompt in Discord.")
	data, err := s.call(ctx, "AUTHORIZE", map[string]any{
		"client_id": creds.ClientID,
		"scopes":    []string{"rpc"},
	}, "", authorizeTimeout)
	if err != nil {
		return err
	}
	var authz struct {
		Code string `json:"code"`
	}
	if err := json.Unmarshal(data, &authz); err != nil {
		return fmt.Errorf("failed to parse AUTHORIZE response: %w", err)
	}
	tok, err := exchangeCode(ctx, creds, authz.Code)
	if err != nil {
		return err
	}
	if err := saveToken(tok); err != nil {
		slog.Warn("Failed to save Discord token", "error", err)
	}
	_, err = s.call(ctx, "AUTHENTICATE", map[string]any{"access_token": tok.AccessToken}, "", rpcTimeout)
	return err
}

type voiceSettings struct {
	Mute  *bool `json:"mute"`
	Deaf  *bool `json:"deaf"`
	Input *struct {
		Volume *float64 `json:"volume"`
	} `json:"input"`
	Output *struct {
		Volume *float64 `json:"volume"`
	} `json:"output"`
}

func applyVoice(data json.RawMessage) {
	var v voiceSettings
	if err := json.Unmarshal(data, &v); err != nil {
		slog.Warn("Failed to parse Discord voice settings", "error", err)
		return
	}
	updateState(func(d *types.DiscordData) {
		if v.Mute != nil {
			d.Mute = v.Mute
		}
		if v.Deaf != nil {
			d.Deaf = v.Deaf
		}
		if v.Input != nil && v.Input.Volume != nil {
			slider := amplitudeToSlider(*v.Input.Volume)
			d.InputVolume = &slider
		}
		if v.Output != nil && v.Output.Volume != nil {
			slider := amplitudeToSlider(*v.Output.Volume)
			d.OutputVolume = &slider
		}
	})
}

// updateState replaces pointer fields instead of writing through them, so
// copies returned by State stay unchanged.
func updateState(fn func(*types.DiscordData)) {
	mu.Lock()
	fn(&state)
	d, notify := state, onUpdate
	mu.Unlock()
	if notify != nil {
		notify(d)
	}
}

type request struct {
	Cmd   string `json:"cmd"`
	Nonce string `json:"nonce"`
	Args  any    `json:"args,omitempty"`
	Evt   string `json:"evt,omitempty"`
}

type message struct {
	Cmd   string          `json:"cmd"`
	Evt   string          `json:"evt"`
	Nonce string          `json:"nonce"`
	Data  json.RawMessage `json:"data"`
}

type response struct {
	data json.RawMessage
	err  error
}

type session struct {
	conn      net.Conn
	writeMu   sync.Mutex
	pendingMu sync.Mutex
	pending   map[string]chan response
	ready     chan struct{}
	readyOnce sync.Once
	done      chan struct{}
	// err is set before done is closed.
	err error
}

func newSession(conn net.Conn) *session {
	return &session{
		conn:    conn,
		pending: make(map[string]chan response),
		ready:   make(chan struct{}),
		done:    make(chan struct{}),
	}
}

func (s *session) send(op opcode, payload any) error {
	s.writeMu.Lock()
	defer s.writeMu.Unlock()
	return writeFrame(s.conn, op, payload)
}

func (s *session) call(ctx context.Context, cmd string, args any, evt string, timeout time.Duration) (json.RawMessage, error) {
	nonce := uuid.NewString()
	ch := make(chan response, 1)
	s.pendingMu.Lock()
	s.pending[nonce] = ch
	s.pendingMu.Unlock()
	defer func() {
		s.pendingMu.Lock()
		delete(s.pending, nonce)
		s.pendingMu.Unlock()
	}()

	if err := s.send(opFrame, request{Cmd: cmd, Nonce: nonce, Args: args, Evt: evt}); err != nil {
		return nil, err
	}

	timer := time.NewTimer(timeout)
	defer timer.Stop()
	select {
	case r := <-ch:
		if r.err != nil {
			return nil, fmt.Errorf("%s failed: %w", cmd, r.err)
		}
		return r.data, nil
	case <-s.done:
		return nil, fmt.Errorf("%s failed: connection closed", cmd)
	case <-ctx.Done():
		return nil, ctx.Err()
	case <-timer.C:
		return nil, fmt.Errorf("%s timed out", cmd)
	}
}

func (s *session) readLoop() {
	defer close(s.done)
	for {
		op, body, err := readFrame(s.conn)
		if err != nil {
			s.err = err
			return
		}
		switch op {
		case opPing:
			if err := s.send(opPong, json.RawMessage(body)); err != nil {
				s.err = err
				return
			}
		case opClose:
			var c struct {
				Code    int    `json:"code"`
				Message string `json:"message"`
			}
			_ = json.Unmarshal(body, &c)
			s.err = fmt.Errorf("discord closed the connection: %s (%d)", c.Message, c.Code)
			return
		case opFrame:
			s.handle(body)
		}
	}
}

func (s *session) handle(body []byte) {
	var m message
	if err := json.Unmarshal(body, &m); err != nil {
		slog.Warn("Failed to parse Discord message", "error", err)
		return
	}

	if m.Cmd == "DISPATCH" && m.Evt == "READY" {
		s.readyOnce.Do(func() { close(s.ready) })
		return
	}

	if m.Nonce != "" {
		s.pendingMu.Lock()
		ch, ok := s.pending[m.Nonce]
		s.pendingMu.Unlock()
		if !ok {
			return
		}
		r := response{data: m.Data}
		if m.Evt == "ERROR" {
			var e struct {
				Code    int    `json:"code"`
				Message string `json:"message"`
			}
			_ = json.Unmarshal(m.Data, &e)
			r.err = fmt.Errorf("%w: %s (%d)", errRejected, e.Message, e.Code)
		}
		ch <- r
		return
	}

	if m.Cmd == "DISPATCH" && m.Evt == "VOICE_SETTINGS_UPDATE" {
		applyVoice(m.Data)
	}
}
