package types

// DiskIOCounters represents disk I/O statistics
type DiskIOCounters struct {
	ReadCount  uint64 `json:"read_count"`
	WriteCount uint64 `json:"write_count"`
	ReadBytes  uint64 `json:"read_bytes"`
	WriteBytes uint64 `json:"write_bytes"`
	ReadTime   uint64 `json:"read_time"`
	WriteTime  uint64 `json:"write_time"`
}

// DiskUsage represents disk space usage information
type DiskUsage struct {
	Total   uint64  `json:"total"`
	Used    uint64  `json:"used"`
	Free    uint64  `json:"free"`
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
