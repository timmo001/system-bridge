package networks

import (
	"github.com/charmbracelet/log"
	psnet "github.com/shirou/gopsutil/v4/net"
	"github.com/timmo001/system-bridge/types"
)

// gatherIOStatistics collects network I/O statistics
func gatherIOStatistics(networksData *types.NetworksData) {
	// Get network I/O stats for all interfaces combined
	ioTotal, err := psnet.IOCounters(false) // pernic=false for total stats
	if err != nil {
		log.Warn("Error getting total network I/O counters", "error", err)
		setDefaultIOStats(networksData)
		return
	}

	if len(ioTotal) == 0 {
		setDefaultIOStats(networksData)
		return
	}

	io := ioTotal[0] // Get the aggregate stats

	bytesSent := int64(io.BytesSent)
	bytesRecv := int64(io.BytesRecv)
	packetsSent := int64(io.PacketsSent)
	packetsRecv := int64(io.PacketsRecv)
	errIn := int64(io.Errin)
	errOut := int64(io.Errout)
	dropIn := int64(io.Dropin)
	dropOut := int64(io.Dropout)

	networkIO := types.NetworkIO{
		BytesSent:   &bytesSent,
		BytesRecv:   &bytesRecv,
		PacketsSent: &packetsSent,
		PacketsRecv: &packetsRecv,
		ErrIn:       &errIn,
		ErrOut:      &errOut,
		DropIn:      &dropIn,
		DropOut:     &dropOut,
	}

	networksData.IO = &networkIO
}

// setDefaultIOStats sets default (zero) values for I/O statistics
func setDefaultIOStats(networksData *types.NetworksData) {
	// Fallback to zeros if unable to get stats
	bytesSent := int64(0)
	bytesRecv := int64(0)
	packetsSent := int64(0)
	packetsRecv := int64(0)
	errIn := int64(0)
	errOut := int64(0)
	dropIn := int64(0)
	dropOut := int64(0)

	networkIO := types.NetworkIO{
		BytesSent:   &bytesSent,
		BytesRecv:   &bytesRecv,
		PacketsSent: &packetsSent,
		PacketsRecv: &packetsRecv,
		ErrIn:       &errIn,
		ErrOut:      &errOut,
		DropIn:      &dropIn,
		DropOut:     &dropOut,
	}

	networksData.IO = &networkIO
}

