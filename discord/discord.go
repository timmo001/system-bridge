// Package discord connects to the local Discord client over its RPC IPC socket.
// It keeps the voice settings and the user's voice channel in sync, and changes
// the voice settings on request.
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
	// connection is the latest voice connection status. Discord can send it
	// before the voice channel has been fetched.
	connection *types.DiscordVoiceConnection
)

// State returns the last known Discord state.
func State() types.DiscordData {
	mu.Lock()
	defer mu.Unlock()
	return state
}

// Run keeps a connection to Discord open until ctx is done. It does nothing
// until the credentials file exists. update receives every state change, and
// is first called once valid credentials load, before Discord connects.
func Run(ctx context.Context, update func(types.DiscordData)) {
	mu.Lock()
	onUpdate = update
	mu.Unlock()

	lastErr := ""
	configured := false
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
			if !configured {
				configured = true
				// Report the disconnected state while Discord is closed.
				updateState(func(*types.DiscordData) {})
			}
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
		updateState(func(d *types.DiscordData) {
			*d = types.DiscordData{}
			connection = nil
		})
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

	auth, err := authenticate(ctx, s, creds)
	if err != nil {
		return err
	}
	applyUser(auth)

	voice, err := s.call(ctx, "GET_VOICE_SETTINGS", nil, "", rpcTimeout)
	if err != nil {
		return err
	}
	applyVoice(voice)
	if _, err := s.call(ctx, "SUBSCRIBE", nil, "VOICE_SETTINGS_UPDATE", rpcTimeout); err != nil {
		return err
	}

	// The call is extra to the voice settings, so failures here are logged
	// instead of ending the session.
	for _, evt := range []string{"CURRENT_USER_UPDATE", "VOICE_CHANNEL_SELECT", "VOICE_CONNECTION_STATUS"} {
		if _, err := s.call(ctx, "SUBSCRIBE", nil, evt, rpcTimeout); err != nil {
			slog.Warn("Failed to subscribe to Discord event", "event", evt, "error", err)
		}
	}
	if err := refreshCall(ctx, s); err != nil {
		slog.Warn("Failed to get the Discord voice channel", "error", err)
	}

	mu.Lock()
	current = s
	mu.Unlock()
	slog.Info("Authenticated with Discord")
	updateState(func(d *types.DiscordData) { d.Authenticated = true })

	for {
		select {
		case <-s.done:
			return s.err
		case <-s.callChanged:
			if err := refreshCall(ctx, s); err != nil {
				slog.Warn("Failed to get the Discord voice channel", "error", err)
			}
		}
	}
}

// channelEvents need the voice channel's ID, so they follow the user between
// channels.
var channelEvents = []string{"VOICE_STATE_CREATE", "VOICE_STATE_UPDATE", "SPEAKING_START", "SPEAKING_STOP"}

// channelTypes names the channel types a voice call can be in.
var channelTypes = map[int]string{1: "DM", 2: "GUILD_VOICE", 3: "GROUP_DM", 13: "GUILD_STAGE_VOICE"}

type rpcVoiceState struct {
	Nick       *string `json:"nick"`
	VoiceState struct {
		Mute     bool `json:"mute"`
		Deaf     bool `json:"deaf"`
		Suppress bool `json:"suppress"`
	} `json:"voice_state"`
	User struct {
		ID string `json:"id"`
	} `json:"user"`
}

func (v rpcVoiceState) member(speaking bool) *types.DiscordCallMember {
	return &types.DiscordCallMember{
		Nick:       v.Nick,
		ServerMute: v.VoiceState.Mute,
		ServerDeaf: v.VoiceState.Deaf,
		Suppress:   v.VoiceState.Suppress,
		Speaking:   speaking,
	}
}

// refreshCall fetches the voice channel the user is in and its server.
func refreshCall(ctx context.Context, s *session) error {
	data, err := s.call(ctx, "GET_SELECTED_VOICE_CHANNEL", nil, "", rpcTimeout)
	if err != nil {
		return err
	}
	var channel *struct {
		ID          string          `json:"id"`
		Name        string          `json:"name"`
		Type        *int            `json:"type"`
		Bitrate     *int            `json:"bitrate"`
		UserLimit   *int            `json:"user_limit"`
		GuildID     *string         `json:"guild_id"`
		VoiceStates []rpcVoiceState `json:"voice_states"`
	}
	if err := json.Unmarshal(data, &channel); err != nil {
		return fmt.Errorf("failed to parse GET_SELECTED_VOICE_CHANNEL response: %w", err)
	}
	if channel == nil {
		s.followChannel(ctx, "")
		updateState(func(d *types.DiscordData) { d.Call = nil })
		return nil
	}
	s.followChannel(ctx, channel.ID)

	// Direct message calls have no server.
	var server *types.DiscordServer
	if channel.GuildID != nil && *channel.GuildID != "" {
		data, err := s.call(ctx, "GET_GUILD", map[string]string{"guild_id": *channel.GuildID}, "", rpcTimeout)
		if err != nil {
			return err
		}
		if err := json.Unmarshal(data, &server); err != nil {
			return fmt.Errorf("failed to parse GET_GUILD response: %w", err)
		}
	}

	var channelType *string
	if channel.Type != nil {
		if name, ok := channelTypes[*channel.Type]; ok {
			channelType = &name
		}
	}

	updateState(func(d *types.DiscordData) {
		// Speaking is only known from events, so keep it while in the same channel.
		speaking := d.Call != nil && d.Call.Channel.ID == channel.ID && d.Call.Me != nil && d.Call.Me.Speaking
		var me *types.DiscordCallMember
		if d.User != nil {
			for _, vs := range channel.VoiceStates {
				if vs.User.ID == d.User.ID {
					me = vs.member(speaking)
				}
			}
		}
		d.Call = &types.DiscordCall{
			Channel: types.DiscordChannel{
				ID:        channel.ID,
				Name:      channel.Name,
				Type:      channelType,
				Bitrate:   channel.Bitrate,
				UserLimit: channel.UserLimit,
			},
			Server:     server,
			Connection: connection,
			Me:         me,
		}
	})
	return nil
}

// followChannel moves the channelEvents subscriptions to channelID, or drops
// them when it is empty.
func (s *session) followChannel(ctx context.Context, channelID string) {
	if s.callChannel == channelID {
		return
	}
	for _, evt := range channelEvents {
		if s.callChannel != "" {
			if _, err := s.call(ctx, "UNSUBSCRIBE", map[string]string{"channel_id": s.callChannel}, evt, rpcTimeout); err != nil {
				slog.Debug("Failed to unsubscribe from Discord event", "event", evt, "error", err)
			}
		}
		if channelID != "" {
			if _, err := s.call(ctx, "SUBSCRIBE", map[string]string{"channel_id": channelID}, evt, rpcTimeout); err != nil {
				slog.Warn("Failed to subscribe to Discord event", "event", evt, "error", err)
			}
		}
	}
	s.callChannel = channelID
}

// applyVoiceState updates the user's own state in the call. Other users'
// states are ignored.
func applyVoiceState(data json.RawMessage) {
	var vs rpcVoiceState
	if err := json.Unmarshal(data, &vs); err != nil {
		slog.Warn("Failed to parse Discord voice state", "error", err)
		return
	}
	updateStateIf(func(d *types.DiscordData) bool {
		if d.Call == nil || d.User == nil || vs.User.ID != d.User.ID {
			return false
		}
		call := *d.Call
		call.Me = vs.member(call.Me != nil && call.Me.Speaking)
		d.Call = &call
		return true
	})
}

func applySpeaking(data json.RawMessage, speaking bool) {
	var e struct {
		UserID string `json:"user_id"`
	}
	if err := json.Unmarshal(data, &e); err != nil {
		slog.Warn("Failed to parse Discord speaking event", "error", err)
		return
	}
	updateStateIf(func(d *types.DiscordData) bool {
		if d.Call == nil || d.Call.Me == nil || d.User == nil || e.UserID != d.User.ID || d.Call.Me.Speaking == speaking {
			return false
		}
		me := *d.Call.Me
		me.Speaking = speaking
		call := *d.Call
		call.Me = &me
		d.Call = &call
		return true
	})
}

func applyConnection(data json.RawMessage) {
	var c types.DiscordVoiceConnection
	if err := json.Unmarshal(data, &c); err != nil {
		slog.Warn("Failed to parse Discord voice connection status", "error", err)
		return
	}
	updateStateIf(func(d *types.DiscordData) bool {
		connection = &c
		if d.Call == nil {
			return false
		}
		call := *d.Call
		call.Connection = &c
		d.Call = &call
		return true
	})
}

// authenticate returns the AUTHENTICATE response.
func authenticate(ctx context.Context, s *session, creds *Credentials) (json.RawMessage, error) {
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
			return nil, fmt.Errorf("failed to refresh Discord token: %w", err)
		default:
			tok = refreshed
			if err := saveToken(tok); err != nil {
				slog.Warn("Failed to save Discord token", "error", err)
			}
		}
	}
	if tok != nil {
		data, err := s.call(ctx, "AUTHENTICATE", map[string]any{"access_token": tok.AccessToken}, "", rpcTimeout)
		if err == nil {
			return data, nil
		}
		if !errors.Is(err, errRejected) {
			return nil, err
		}
		slog.Info("Discord rejected the stored token, authorizing again", "error", err)
		clearToken()
	}

	data, err := authorize(ctx, s, creds)
	if err != nil {
		return nil, fmt.Errorf("%w: %w", errAuth, err)
	}
	return data, nil
}

// authorize shows the Discord approval prompt, stores the new token and
// returns the AUTHENTICATE response.
func authorize(ctx context.Context, s *session, creds *Credentials) (json.RawMessage, error) {
	slog.Info("Requesting Discord authorization. Approve the prompt in Discord.")
	data, err := s.call(ctx, "AUTHORIZE", map[string]any{
		"client_id": creds.ClientID,
		"scopes":    []string{"rpc"},
	}, "", authorizeTimeout)
	if err != nil {
		return nil, err
	}
	var authz struct {
		Code string `json:"code"`
	}
	if err := json.Unmarshal(data, &authz); err != nil {
		return nil, fmt.Errorf("failed to parse AUTHORIZE response: %w", err)
	}
	tok, err := exchangeCode(ctx, creds, authz.Code)
	if err != nil {
		return nil, err
	}
	if err := saveToken(tok); err != nil {
		slog.Warn("Failed to save Discord token", "error", err)
	}
	return s.call(ctx, "AUTHENTICATE", map[string]any{"access_token": tok.AccessToken}, "", rpcTimeout)
}

func applyUser(data json.RawMessage) {
	var auth struct {
		User *rpcUser `json:"user"`
	}
	if err := json.Unmarshal(data, &auth); err != nil {
		slog.Warn("Failed to parse Discord user", "error", err)
		return
	}
	if auth.User != nil {
		setUser(*auth.User)
	}
}

func applyUserUpdate(data json.RawMessage) {
	var u rpcUser
	if err := json.Unmarshal(data, &u); err != nil {
		slog.Warn("Failed to parse Discord user", "error", err)
		return
	}
	setUser(u)
}

type rpcUser struct {
	ID         string  `json:"id"`
	Username   string  `json:"username"`
	GlobalName *string `json:"global_name"`
	Avatar     *string `json:"avatar"`
}

func setUser(u rpcUser) {
	user := types.DiscordUser{
		ID:         u.ID,
		Username:   u.Username,
		GlobalName: u.GlobalName,
	}
	if u.Avatar != nil && *u.Avatar != "" {
		url := fmt.Sprintf("https://cdn.discordapp.com/avatars/%s/%s.png", u.ID, *u.Avatar)
		user.AvatarURL = &url
	}
	updateState(func(d *types.DiscordData) { d.User = &user })
}

type voiceDevices struct {
	DeviceID         *string               `json:"device_id"`
	Volume           *float64              `json:"volume"`
	AvailableDevices []types.DiscordDevice `json:"available_devices"`
}

type voiceSettings struct {
	Mute                 *bool                   `json:"mute"`
	Deaf                 *bool                   `json:"deaf"`
	Input                *voiceDevices           `json:"input"`
	Output               *voiceDevices           `json:"output"`
	Mode                 *types.DiscordVoiceMode `json:"mode"`
	AutomaticGainControl *bool                   `json:"automatic_gain_control"`
	EchoCancellation     *bool                   `json:"echo_cancellation"`
	NoiseSuppression     *bool                   `json:"noise_suppression"`
	QoS                  *bool                   `json:"qos"`
	SilenceWarning       *bool                   `json:"silence_warning"`
}

// setIfPresent leaves dst alone when Discord omitted the field.
func setIfPresent[T any](dst **T, v *T) {
	if v != nil {
		*dst = v
	}
}

// copyOf returns a new copy of cur, or a zero value when cur is nil.
func copyOf[T any](cur *T) *T {
	next := new(T)
	if cur != nil {
		*next = *cur
	}
	return next
}

func mergeAudio(cur *types.DiscordAudio, v *voiceDevices) *types.DiscordAudio {
	next := copyOf(cur)
	if v.Volume != nil {
		slider := amplitudeToSlider(*v.Volume)
		next.Volume = &slider
	}
	setIfPresent(&next.DeviceID, v.DeviceID)
	if v.AvailableDevices != nil {
		next.Devices = v.AvailableDevices
	}
	if next.Devices == nil {
		next.Devices = []types.DiscordDevice{}
	}
	return next
}

func applyVoice(data json.RawMessage) {
	var v voiceSettings
	if err := json.Unmarshal(data, &v); err != nil {
		slog.Warn("Failed to parse Discord voice settings", "error", err)
		return
	}
	updateState(func(d *types.DiscordData) {
		setIfPresent(&d.Mute, v.Mute)
		setIfPresent(&d.Deaf, v.Deaf)
		if v.Input != nil {
			d.Input = mergeAudio(d.Input, v.Input)
		}
		if v.Output != nil {
			d.Output = mergeAudio(d.Output, v.Output)
		}
		if v.Mode != nil {
			mode := copyOf(d.Mode)
			setIfPresent(&mode.Type, v.Mode.Type)
			setIfPresent(&mode.AutoThreshold, v.Mode.AutoThreshold)
			setIfPresent(&mode.Threshold, v.Mode.Threshold)
			setIfPresent(&mode.Delay, v.Mode.Delay)
			d.Mode = mode
		}
		if v.NoiseSuppression != nil || v.EchoCancellation != nil || v.AutomaticGainControl != nil {
			processing := copyOf(d.Processing)
			setIfPresent(&processing.NoiseSuppression, v.NoiseSuppression)
			setIfPresent(&processing.EchoCancellation, v.EchoCancellation)
			setIfPresent(&processing.AutomaticGainControl, v.AutomaticGainControl)
			d.Processing = processing
		}
		setIfPresent(&d.QoS, v.QoS)
		setIfPresent(&d.SilenceWarning, v.SilenceWarning)
	})
}

// updateState replaces pointer fields instead of writing through them, so
// copies returned by State stay unchanged.
func updateState(fn func(*types.DiscordData)) {
	updateStateIf(func(d *types.DiscordData) bool {
		fn(d)
		return true
	})
}

// updateStateIf is updateState for events that may not change anything. It
// only notifies when fn returns true.
func updateStateIf(fn func(*types.DiscordData) bool) {
	mu.Lock()
	changed := fn(&state)
	d, notify := state, onUpdate
	mu.Unlock()
	if changed && notify != nil {
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
	// callChanged is signalled when the user joins, leaves or switches voice
	// channel.
	callChanged chan struct{}
	// callChannel is the channel the channelEvents subscriptions are for. Only
	// the session goroutine uses it.
	callChannel string
	// err is set before done is closed.
	err error
}

func newSession(conn net.Conn) *session {
	return &session{
		conn:    conn,
		pending: make(map[string]chan response),
		ready:   make(chan struct{}),
		done:    make(chan struct{}),
		// One pending refresh covers any number of switches.
		callChanged: make(chan struct{}, 1),
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

	if m.Cmd != "DISPATCH" {
		return
	}
	switch m.Evt {
	case "VOICE_SETTINGS_UPDATE":
		applyVoice(m.Data)
	case "CURRENT_USER_UPDATE":
		applyUserUpdate(m.Data)
	case "VOICE_CONNECTION_STATUS":
		applyConnection(m.Data)
	case "VOICE_STATE_CREATE", "VOICE_STATE_UPDATE":
		applyVoiceState(m.Data)
	case "SPEAKING_START":
		applySpeaking(m.Data, true)
	case "SPEAKING_STOP":
		applySpeaking(m.Data, false)
	case "VOICE_CHANNEL_SELECT":
		// Fetching the channel waits for replies that this read loop delivers,
		// so the session goroutine does it.
		select {
		case s.callChanged <- struct{}{}:
		default:
		}
	}
}
