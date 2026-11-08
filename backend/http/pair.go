package http

import (
	"crypto/rand"
	"encoding/base32"
	"encoding/json"
	"log/slog"
	"net"
	"net/http"
	"net/url"
	"os"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/shirou/gopsutil/v4/host"

	"github.com/timmo001/system-bridge/utils"
)

// pairCodeLifetime is how long a pairing code works for
const pairCodeLifetime = 5 * time.Minute

// maxBodyBytes caps what the small JSON routes read
const maxBodyBytes = 64 << 10

// PairCodes are the one-time codes a phone trades for the API token
type PairCodes struct {
	mu    sync.Mutex
	codes map[string]time.Time // code -> when it expires
	now   func() time.Time
}

// NewPairCodes makes an empty set of codes
func NewPairCodes() *PairCodes {
	return &PairCodes{codes: map[string]time.Time{}, now: time.Now}
}

// create makes a code, forgetting any that have expired
func (p *PairCodes) create() (string, time.Time, error) {
	// 160 random bits, so guessing one isn't practical
	random := make([]byte, 20)
	if _, err := rand.Read(random); err != nil {
		return "", time.Time{}, err
	}
	code := base32.StdEncoding.WithPadding(base32.NoPadding).EncodeToString(random)

	p.mu.Lock()
	defer p.mu.Unlock()
	now := p.now()
	for existing, expires := range p.codes {
		if now.After(expires) {
			delete(p.codes, existing)
		}
	}
	expires := now.Add(pairCodeLifetime)
	p.codes[code] = expires
	return code, expires, nil
}

// take uses up a code, saying whether it was there and still worked
func (p *PairCodes) take(code string) bool {
	p.mu.Lock()
	defer p.mu.Unlock()
	expires, ok := p.codes[code]
	if !ok {
		return false
	}
	delete(p.codes, code)
	return !p.now().After(expires)
}

// PairedService is the computer a phone pairs with, as the pairing contract
// names it
type PairedService struct {
	// ID matches the uuid System Bridge advertises over mDNS, so a computer
	// found that way matches the one paired
	ID   string `json:"id"`
	Name string `json:"name"`
}

// ThisService is this computer, as a phone pairing with it sees it
func ThisService() PairedService {
	hostname, err := os.Hostname()
	if err != nil {
		hostname = "systembridge"
	}
	info, err := host.Info()
	if err != nil {
		slog.Warn("Failed to get host info for the pairing ID", "error", err)
		info = &host.InfoStat{Hostname: hostname}
	}
	return PairedService{
		ID:   utils.GetSystemUUID(info.HostID, utils.PrimaryMACAddress(), info.Hostname),
		Name: hostname,
	}
}

// pairLink is the link a pairing code's QR code holds. A name the request
// came to, such as desk.lan, is kept. An address, or this computer's
// loopback, becomes its mDNS name, such as desk.local, which still finds it
// when its address changes; the address, or the one on the default route
// for loopback, rides along in `ip` for a phone that can't resolve the name.
func pairLink(scheme, requestHost, code, name string) string {
	host, port, err := net.SplitHostPort(requestHost)
	if err != nil {
		host, port = requestHost, strconv.Itoa(utils.GetPort())
	}
	ip := net.ParseIP(host)
	loopback := host == "localhost" || (ip != nil && ip.IsLoopback())
	if ip == nil && !loopback {
		return scheme + "://" + requestHost + "/?pair=" + code
	}

	fallback := host
	if loopback {
		fallback = utils.PrimaryIPv4Address()
	}
	query := url.Values{"pair": {code}}
	if fallback != "" {
		query.Set("ip", fallback)
	}
	return scheme + "://" + net.JoinHostPort(name, port) + "/?" + query.Encode()
}

// localName is this computer's mDNS name, such as desk.local
func localName() string {
	hostname, err := os.Hostname()
	if err != nil || hostname == "" {
		return "localhost"
	}
	return strings.TrimSuffix(hostname, ".local") + ".local"
}

// PairCodeHandler makes a pairing code and its link, for the QR code. It
// needs the token.
func PairCodeHandler(token string, codes *PairCodes) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			w.Header().Set("Allow", http.MethodPost)
			writeError(w, http.StatusMethodNotAllowed, "Method not allowed")
			return
		}
		if !TokenValid(r, token) {
			writeError(w, http.StatusUnauthorized, "Invalid API token")
			return
		}
		code, expires, err := codes.create()
		if err != nil {
			slog.Error("Failed to make a pairing code", "error", err)
			writeError(w, http.StatusInternalServerError, "Failed to make a pairing code")
			return
		}
		scheme := "http"
		if r.TLS != nil {
			scheme = "https"
		}
		writeJSON(w, http.StatusOK, map[string]string{
			"code":      code,
			"link":      pairLink(scheme, r.Host, code, localName()),
			"expiresAt": expires.UTC().Format(time.RFC3339),
		})
	}
}

// pairRequest is the pairing contract's PairingRequest
type pairRequest struct {
	Code   string `json:"code"`
	Client struct {
		ID       string `json:"id"`
		Name     string `json:"name"`
		Platform string `json:"platform"`
	} `json:"client"`
}

// PairHandler trades a pairing code for the API token. It takes no token, as
// the code is the credential, and each code works once.
func PairHandler(token string, codes *PairCodes, service PairedService) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			w.Header().Set("Allow", http.MethodPost)
			writeError(w, http.StatusMethodNotAllowed, "Method not allowed")
			return
		}
		var request pairRequest
		if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, maxBodyBytes)).Decode(&request); err != nil {
			writeError(w, http.StatusBadRequest, "Invalid pairing request")
			return
		}
		if request.Code == "" || !codes.take(request.Code) {
			writeError(w, http.StatusUnauthorized, "Unknown or expired pairing code")
			return
		}
		slog.Info("Paired a client", "name", request.Client.Name, "platform", request.Client.Platform)
		writeJSON(w, http.StatusOK, map[string]any{
			"token":   token,
			"service": service,
		})
	}
}
