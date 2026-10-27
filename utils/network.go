package utils

import (
	"context"
	"errors"
	"log/slog"
	"net"
	"time"
)

// PrimaryIPv4Address is the IPv4 address on the default route
func PrimaryIPv4Address() string {
	ctx, cancel := context.WithTimeout(context.Background(), 1*time.Second)
	defer cancel()
	d := net.Dialer{Timeout: 1 * time.Second}
	conn, err := d.DialContext(ctx, "udp", "8.8.8.8:80")
	if err != nil {
		slog.Info("IPv4 address unavailable", "error", err)
		return ""
	}
	defer func() {
		err = errors.Join(err, conn.Close())
	}()

	localAddr := conn.LocalAddr().(*net.UDPAddr)
	return localAddr.IP.String()
}

// PrimaryMACAddress is the MAC address of the first interface that isn't a
// loopback and has one
func PrimaryMACAddress() string {
	interfaces, err := net.Interfaces()
	if err != nil {
		slog.Info("MAC address unavailable", "error", err)
		return ""
	}

	for _, iface := range interfaces {
		// Skip loopback and interfaces without MAC
		if iface.Flags&net.FlagLoopback == 0 && len(iface.HardwareAddr) > 0 {
			return iface.HardwareAddr.String()
		}
	}

	slog.Debug("No MAC address found")
	return ""
}
