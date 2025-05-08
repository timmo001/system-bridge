package networks

import (
	"fmt"

	"github.com/charmbracelet/log"
	psnet "github.com/shirou/gopsutil/v4/net"
	"github.com/timmo001/system-bridge/types"
)

// gatherConnections collects information about network connections
func GatherConnections(networksData *types.NetworksData) {
	// Get network connections
	connections, err := psnet.Connections("all")
	if err != nil {
		log.Warn("Error getting network connections", "error", err)
		return
	}

	for _, conn := range connections {
		fd := int(conn.Fd)
		family := int(conn.Family)
		connType := int(conn.Type)

		// Format local and remote addresses
		laddr := fmt.Sprintf("%s:%d", conn.Laddr.IP, conn.Laddr.Port)
		raddr := fmt.Sprintf("%s:%d", conn.Raddr.IP, conn.Raddr.Port)

		pid := int(conn.Pid)

		netConn := types.NetworkConnection{
			FD:     &fd,
			Family: &family,
			Type:   &connType,
			LAddr:  &laddr,
			RAddr:  &raddr,
			Status: &conn.Status,
			PID:    &pid,
		}

		networksData.Connections = append(networksData.Connections, netConn)
	}
}
