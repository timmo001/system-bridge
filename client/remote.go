package client

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/timmo001/system-bridge/keys"
	"github.com/timmo001/system-bridge/utils"
)

const pairTimeout = 10 * time.Second

// defaultRemotePort is the port System Bridge listens on unless it's changed
const defaultRemotePort = 9170

// Remote is another computer's System Bridge this one has paired with, and
// the key it gave this computer. The key is a credential, so never log it.
type Remote struct {
	// ID is the service ID the remote answered pairing with, the uuid it
	// advertises over mDNS
	ID string `json:"id"`
	// Name is its hostname
	Name string `json:"name"`
	// URL is where it answered, such as http://desk.local:9170
	URL    string `json:"url"`
	Key    string `json:"key"`
	Paired string `json:"paired"`
}

// remoteFile is what is kept of the remotes, in a file only this user can read
type remoteFile struct {
	// ClientID is who this computer is to every remote, so pairing again
	// replaces its key there rather than adding another
	ClientID string   `json:"clientId"`
	Remotes  []Remote `json:"remotes"`
}

func remotesPath() (string, error) {
	dir, err := utils.GetConfigPath()
	if err != nil {
		return "", fmt.Errorf("could not get config path: %w", err)
	}
	return filepath.Join(dir, "remotes.json"), nil
}

func loadRemotes() (remoteFile, error) {
	path, err := remotesPath()
	if err != nil {
		return remoteFile{}, err
	}
	raw, err := os.ReadFile(path)
	if errors.Is(err, os.ErrNotExist) {
		return remoteFile{}, nil
	}
	if err != nil {
		return remoteFile{}, fmt.Errorf("read the paired remotes: %w", err)
	}
	var file remoteFile
	if err := json.Unmarshal(raw, &file); err != nil {
		return remoteFile{}, fmt.Errorf("parse the paired remotes in %s: %w", path, err)
	}
	return file, nil
}

func (f remoteFile) save() error {
	path, err := remotesPath()
	if err != nil {
		return err
	}
	raw, err := json.MarshalIndent(f, "", "  ")
	if err != nil {
		return fmt.Errorf("encode the paired remotes: %w", err)
	}
	temp := path + ".tmp"
	if err := os.WriteFile(temp, raw, 0o600); err != nil {
		return fmt.Errorf("write the paired remotes: %w", err)
	}
	if err := os.Rename(temp, path); err != nil {
		return fmt.Errorf("write the paired remotes: %w", err)
	}
	return nil
}

// Remotes lists the paired remotes
func Remotes() ([]Remote, error) {
	file, err := loadRemotes()
	if err != nil {
		return nil, err
	}
	return file.Remotes, nil
}

// remoteHost is the host a remote's URL points at, without its port
func remoteHost(remote Remote) string {
	parsed, err := url.Parse(remote.URL)
	if err != nil {
		return ""
	}
	return parsed.Hostname()
}

// find is the index of the remote with this ID, name or host, ignoring case
func (f remoteFile) find(name string) (int, error) {
	found := -1
	for i, remote := range f.Remotes {
		if remote.ID != name && !strings.EqualFold(remote.Name, name) && !strings.EqualFold(remoteHost(remote), name) {
			continue
		}
		if remote.ID == name {
			return i, nil
		}
		if found >= 0 {
			return -1, fmt.Errorf("more than one paired remote is called %s: use its ID from system-bridge client remote list", name)
		}
		found = i
	}
	if found < 0 {
		return -1, fmt.Errorf("no paired remote %s: pair it with system-bridge client remote pair, or see system-bridge client remote list", name)
	}
	return found, nil
}

// FindRemote is the paired remote with this ID, name or host
func FindRemote(name string) (Remote, error) {
	file, err := loadRemotes()
	if err != nil {
		return Remote{}, err
	}
	index, err := file.find(name)
	if err != nil {
		return Remote{}, err
	}
	return file.Remotes[index], nil
}

// RemoveRemote forgets a paired remote. Its key stays listed on the remote
// until it is removed there, under Settings > Devices.
func RemoveRemote(name string) (Remote, error) {
	file, err := loadRemotes()
	if err != nil {
		return Remote{}, err
	}
	index, err := file.find(name)
	if err != nil {
		return Remote{}, err
	}
	removed := file.Remotes[index]
	file.Remotes = append(file.Remotes[:index], file.Remotes[index+1:]...)
	return removed, file.save()
}

// PairOptions say where to pair when the code comes without its link
type PairOptions struct {
	Host string
	Port int
	SSL  bool
}

// pairTargets reads what was entered, a pairing code or its link, into the
// code and the addresses to try in order. A link's own address comes first,
// then the address in its `ip`, for a name this computer can't resolve, as
// the Android app does. A host given in options goes before both.
func pairTargets(text string, options PairOptions) (string, []url.URL, error) {
	text = strings.TrimSpace(text)
	if text == "" {
		return "", nil, fmt.Errorf("a pairing code or link is required")
	}
	scheme := "http"
	if options.SSL {
		scheme = "https"
	}
	port := options.Port
	if port == 0 {
		port = defaultRemotePort
	}

	code := text
	var targets []url.URL
	if link, err := url.Parse(text); err == nil && (link.Scheme == "http" || link.Scheme == "https") && link.Host != "" {
		code = link.Query().Get("pair")
		if code == "" {
			return "", nil, fmt.Errorf("the link has no pairing code in it")
		}
		targets = append(targets, url.URL{Scheme: link.Scheme, Host: link.Host})
		if ip := link.Query().Get("ip"); ip != "" {
			linkPort := link.Port()
			if linkPort == "" {
				linkPort = strconv.Itoa(port)
			}
			targets = append(targets, url.URL{Scheme: link.Scheme, Host: net.JoinHostPort(ip, linkPort)})
		}
	}
	if options.Host != "" {
		targets = append([]url.URL{{Scheme: scheme, Host: net.JoinHostPort(options.Host, strconv.Itoa(port))}}, targets...)
	}
	if len(targets) == 0 {
		return "", nil, fmt.Errorf("a pairing code needs --host, or pair with its link instead")
	}
	return code, targets, nil
}

// pairAnswer is what POST /api/pair answers
type pairAnswer struct {
	Token   string `json:"token"`
	Service struct {
		ID   string `json:"id"`
		Name string `json:"name"`
	} `json:"service"`
}

// errUnreachable is a pairing request that never got an answer, so the code
// is unused and the next address can take it
type errUnreachable struct{ err error }

func (e errUnreachable) Error() string { return e.err.Error() }

func pairAt(ctx context.Context, target url.URL, code string, client keys.Client) (pairAnswer, error) {
	ctx, cancel := context.WithTimeout(ctx, pairTimeout)
	defer cancel()
	body, err := json.Marshal(map[string]any{
		"code":   code,
		"client": map[string]string{"id": client.ID, "name": client.Name, "platform": client.Kind},
	})
	if err != nil {
		return pairAnswer{}, fmt.Errorf("encode the pairing request: %w", err)
	}
	target.Path = "/api/pair"
	request, err := http.NewRequestWithContext(ctx, http.MethodPost, target.String(), bytes.NewReader(body))
	if err != nil {
		return pairAnswer{}, fmt.Errorf("create the pairing request: %w", err)
	}
	request.Header.Set("Content-Type", "application/json")
	response, err := http.DefaultClient.Do(request)
	if err != nil {
		return pairAnswer{}, errUnreachable{err}
	}
	defer func() { _ = response.Body.Close() }()
	switch response.StatusCode {
	case http.StatusOK:
	case http.StatusUnauthorized:
		return pairAnswer{}, fmt.Errorf("that pairing code has been used or has expired: make a new one in System Bridge")
	default:
		return pairAnswer{}, fmt.Errorf("pair with %s: %s", target.Host, response.Status)
	}
	var answer pairAnswer
	if err := json.NewDecoder(response.Body).Decode(&answer); err != nil {
		return pairAnswer{}, fmt.Errorf("pair with %s: unexpected answer", target.Host)
	}
	if _, ok := keys.Parse(answer.Token); !ok || answer.Service.ID == "" {
		return pairAnswer{}, fmt.Errorf("pair with %s: unexpected answer", target.Host)
	}
	return answer, nil
}

// Pair trades a pairing code, or its link, for a key of this computer's own
// on another computer's System Bridge, and keeps it. Pairing the same remote
// again replaces its key.
func Pair(ctx context.Context, text string, options PairOptions) (Remote, error) {
	code, targets, err := pairTargets(text, options)
	if err != nil {
		return Remote{}, err
	}
	file, err := loadRemotes()
	if err != nil {
		return Remote{}, err
	}
	if file.ClientID == "" {
		file.ClientID = uuid.NewString()
	}
	hostname, err := os.Hostname()
	if err != nil || hostname == "" {
		hostname = "System Bridge CLI"
	}
	client := keys.Client{ID: file.ClientID, Name: hostname, Kind: "cli"}

	var answer pairAnswer
	var answered url.URL
	var failures []string
	for _, target := range targets {
		answer, err = pairAt(ctx, target, code, client)
		var unreachable errUnreachable
		if errors.As(err, &unreachable) {
			failures = append(failures, fmt.Sprintf("%s: %v", target.Host, unreachable.err))
			continue
		}
		if err != nil {
			return Remote{}, err
		}
		answered = target
		break
	}
	if answered.Host == "" {
		return Remote{}, fmt.Errorf("could not reach System Bridge: %s", strings.Join(failures, "; "))
	}

	remote := Remote{
		ID:     answer.Service.ID,
		Name:   answer.Service.Name,
		URL:    answered.String(),
		Key:    answer.Token,
		Paired: time.Now().UTC().Format(time.RFC3339),
	}
	replaced := false
	for i, existing := range file.Remotes {
		if existing.ID == remote.ID {
			file.Remotes[i] = remote
			replaced = true
		}
	}
	if !replaced {
		file.Remotes = append(file.Remotes, remote)
	}
	if err := file.save(); err != nil {
		return Remote{}, err
	}
	return remote, nil
}
