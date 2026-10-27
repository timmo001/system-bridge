//go:build windows

package notification

import (
	"fmt"
	"log/slog"
	"os"
	"path/filepath"
	"sync"
	"sync/atomic"

	"git.sr.ht/~jackmordaunt/go-toast/v2/wintoast"
)

// activationGUID is the COM class Windows calls back when one of System
// Bridge's notifications, or a button on it, is clicked
const activationGUID = "{A61E2CEE-38E4-4998-BC63-A04A8B06224C}"

var (
	appDataOnce sync.Once
	appDataErr  error

	nextID atomic.Uint32

	// sent are the notifications sent that open something when clicked, by
	// id. Windows reports clicks but not closes, so each is forgotten once
	// it's clicked.
	sentMu sync.Mutex
	sent   = map[uint32]sentToast{}
)

type sentToast struct {
	notifier *windowsNotifier
	url      string
	path     string
}

// windowsNotifier sends toast notifications through the Windows Runtime
type windowsNotifier struct {
	appName  string
	openURL  func(string) error
	openPath func(string) error
}

// newPlatformNotifier registers System Bridge with Windows, once, so its
// toasts can show and report clicks
func newPlatformNotifier(appName string, openURL, openPath func(string) error) (platformNotifier, error) {
	appDataOnce.Do(func() {
		data := wintoast.AppData{AppID: appName, GUID: activationGUID}
		if executable, err := os.Executable(); err == nil {
			icon := filepath.Join(filepath.Dir(executable), "system-bridge.ico")
			if _, err := os.Stat(icon); err == nil {
				data.IconPath = icon
			}
		}
		appDataErr = wintoast.SetAppData(data)
		wintoast.SetActivationCallback(activated)
	})
	if appDataErr != nil {
		return nil, fmt.Errorf("register notifications with Windows: %w", appDataErr)
	}

	return &windowsNotifier{
		appName:  appName,
		openURL:  openURL,
		openPath: openPath,
	}, nil
}

// notify shows a toast through the Windows Runtime. There's no PowerShell
// fallback: it would run the toast's text as part of a script.
func (n *windowsNotifier) notify(data NotificationData) (uint32, error) {
	id := nextID.Add(1)
	toast, err := buildToast(id, data)
	if err != nil {
		return 0, err
	}
	if err := wintoast.Push(n.appName, toast); err != nil {
		return 0, fmt.Errorf("show the toast: %w", err)
	}

	if data.ActionURL != "" || data.ActionPath != "" {
		sentMu.Lock()
		sent[id] = sentToast{notifier: n, url: data.ActionURL, path: data.ActionPath}
		sentMu.Unlock()
	}
	return id, nil
}

// activated is called by Windows when a toast or one of its buttons is
// clicked
func activated(_ string, arguments string, _ []wintoast.UserData) {
	id, action, ok := parseActivationArguments(arguments)
	if !ok {
		slog.Debug("Ignoring a toast activation", "arguments", arguments)
		return
	}

	sentMu.Lock()
	toast, ok := sent[id]
	delete(sent, id)
	sentMu.Unlock()

	if ok && action == DefaultAction {
		// URL takes precedence over path
		if toast.url != "" && toast.notifier.openURL != nil {
			if err := toast.notifier.openURL(toast.url); err != nil {
				slog.Error("Failed to open URL from notification", "url", toast.url, "error", err)
			}
		} else if toast.path != "" && toast.notifier.openPath != nil {
			if err := toast.notifier.openPath(toast.path); err != nil {
				slog.Error("Failed to open path from notification", "path", toast.path, "error", err)
			}
		}
	}

	emit(Event{ID: id, Action: action})
}

// dismiss isn't supported, as the Windows Runtime toast API go-toast wraps
// can't remove a toast once shown
func (n *windowsNotifier) dismiss(uint32) error {
	return ErrUnsupported
}

// close is a no-op on Windows
func (n *windowsNotifier) close() error {
	return nil
}

// playSound is a no-op on Windows (system handles notification sounds)
func playSound(_ string) error {
	// Windows handles notification sounds through system settings
	return nil
}
