package data_module

import "github.com/charmbracelet/log"

// DiskIOCounters represents disk I/O statistics
type DiskIOCounters struct {
	ReadCount  int64 `json:"read_count"`
	WriteCount int64 `json:"write_count"`
	ReadBytes  int64 `json:"read_bytes"`
	WriteBytes int64 `json:"write_bytes"`
	ReadTime   int64 `json:"read_time"`
	WriteTime  int64 `json:"write_time"`
}

// DiskUsage represents disk space usage information
type DiskUsage struct {
	Total   int64   `json:"total"`
	Used    int64   `json:"used"`
	Free    int64   `json:"free"`
	Percent float64 `json:"percent"`
}

// DiskPartition represents information about a disk partition
type DiskPartition struct {
	Device         string     `json:"device"`
	MountPoint     string     `json:"mount_point"`
	FilesystemType string     `json:"filesystem_type"`
	Options        string     `json:"options"`
	MaxFileSize    int64      `json:"max_file_size"`
	MaxPathLength  int64      `json:"max_path_length"`
	Usage          *DiskUsage `json:"usage"`
}

// Disk represents information about a single disk device
type Disk struct {
	Name       string          `json:"name"`
	Partitions []DiskPartition `json:"partitions"`
	IOCounters *DiskIOCounters `json:"io_counters"`
}

// DisksData represents information about all disk devices
type DisksData struct {
	Devices    []Disk          `json:"devices"`
	IOCounters *DiskIOCounters `json:"io_counters"`
}

func (t *Module) UpdateDisksModule() (DisksData, error) {
	log.Info("Getting disks data")

	var disksData DisksData
	// Initialize arrays
	disksData.Devices = make([]Disk, 0)

	// TODO: Implement
	return disksData, nil
}
