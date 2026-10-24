//go:build linux

package networks

import (
	"context"
	"syscall"
	"time"

	"golang.org/x/sys/unix"

	"github.com/timmo001/system-bridge/utils/watch"
)

// watchDebounce groups the link and address events that connecting to a
// network makes into a single update.
const watchDebounce = 500 * time.Millisecond

// watchRetry is how long to wait before opening the netlink socket again
// after it fails.
const watchRetry = 5 * time.Second

// Watch calls changed whenever an interface comes up or goes down, or gains
// or loses an address, until ctx is done. Joining or leaving a Wi-Fi network
// changes the link's state, so it's reported too.
func Watch(ctx context.Context, changed func()) {
	trigger, stop := watch.Debounce(watchDebounce, changed)
	defer stop()

	groups := uint32(unix.RTMGRP_LINK | unix.RTMGRP_IPV4_IFADDR | unix.RTMGRP_IPV6_IFADDR)
	watch.Retry(ctx, watchRetry, "rtnetlink", func(ctx context.Context) error {
		return watch.Netlink(ctx, unix.NETLINK_ROUTE, groups, func(message []byte) {
			if relevantRouteMessage(message) {
				trigger()
			}
		})
	})
}

// relevantRouteMessage reports whether a route netlink message is a link or
// address change. Wireless extension events, such as scan results, also
// arrive as link messages, and are left out.
func relevantRouteMessage(message []byte) bool {
	messages, err := syscall.ParseNetlinkMessage(message)
	if err != nil {
		return false
	}
	for _, m := range messages {
		switch m.Header.Type {
		case unix.RTM_NEWADDR, unix.RTM_DELADDR, unix.RTM_DELLINK:
			return true
		case unix.RTM_NEWLINK:
			if !isWirelessEvent(m) {
				return true
			}
		}
	}
	return false
}

func isWirelessEvent(m syscall.NetlinkMessage) bool {
	attrs, err := syscall.ParseNetlinkRouteAttr(&m)
	if err != nil {
		return false
	}
	for _, attr := range attrs {
		if attr.Attr.Type == unix.IFLA_WIRELESS {
			return true
		}
	}
	return false
}
