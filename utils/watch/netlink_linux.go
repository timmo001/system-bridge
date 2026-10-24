//go:build linux

package watch

import (
	"bytes"
	"context"
	"fmt"
	"slices"
	"time"

	"golang.org/x/sys/unix"
)

// receiveTimeout bounds each wait on a netlink socket, so a watcher notices
// when its context is done.
const receiveTimeout = time.Second

// retryDelay is how long to wait before opening a netlink socket again after
// it fails.
const retryDelay = 5 * time.Second

// Uevents calls changed, delay after the last of a burst, whenever the kernel
// reports a device event in one of subsystems, such as power_supply or drm,
// until ctx is done.
func Uevents(ctx context.Context, delay time.Duration, subsystems []string, changed func()) {
	trigger, stop := Debounce(delay, changed)
	defer stop()

	Retry(ctx, retryDelay, "uevent", func(ctx context.Context) error {
		// Group 1 is the kernel's own events, before udev handles them
		return Netlink(ctx, unix.NETLINK_KOBJECT_UEVENT, 1, func(message []byte) {
			if slices.Contains(subsystems, ueventSubsystem(message)) {
				trigger()
			}
		})
	})
}

// ueventSubsystem returns the SUBSYSTEM of a kernel uevent, which is an
// "action@devpath" header followed by NUL separated KEY=value pairs.
func ueventSubsystem(message []byte) string {
	for field := range bytes.SplitSeq(message, []byte{0}) {
		if value, ok := bytes.CutPrefix(field, []byte("SUBSYSTEM=")); ok {
			return string(value)
		}
	}
	return ""
}

// Netlink opens a netlink socket of family, joins the multicast groups and
// passes each message it receives to handle, until ctx is done or the socket
// fails.
func Netlink(ctx context.Context, family int, groups uint32, handle func([]byte)) error {
	fd, err := unix.Socket(unix.AF_NETLINK, unix.SOCK_DGRAM|unix.SOCK_CLOEXEC, family)
	if err != nil {
		return fmt.Errorf("failed to open a netlink socket: %w", err)
	}
	defer func() { _ = unix.Close(fd) }()

	if err := unix.Bind(fd, &unix.SockaddrNetlink{Family: unix.AF_NETLINK, Groups: groups}); err != nil {
		return fmt.Errorf("failed to join netlink groups: %w", err)
	}
	timeout := unix.NsecToTimeval(receiveTimeout.Nanoseconds())
	if err := unix.SetsockoptTimeval(fd, unix.SOL_SOCKET, unix.SO_RCVTIMEO, &timeout); err != nil {
		return fmt.Errorf("failed to set the netlink receive timeout: %w", err)
	}

	buf := make([]byte, 64*1024)
	for ctx.Err() == nil {
		n, _, err := unix.Recvfrom(fd, buf, 0)
		switch err {
		case nil:
			handle(buf[:n])
		case unix.EAGAIN, unix.EINTR, unix.ENOBUFS:
			// ENOBUFS means events were dropped while busy. The next
			// refresh picks up what they changed.
		default:
			return fmt.Errorf("failed to read from netlink: %w", err)
		}
	}
	return nil
}
