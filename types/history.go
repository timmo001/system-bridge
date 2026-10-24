package types

// HistorySample is one reading of a metric
type HistorySample struct {
	// Time is when the reading was taken, in Unix milliseconds
	Time  int64   `json:"time"`
	Value float64 `json:"value"`
}

// SeriesHistory is the history of one of several readings of the same
// kind, such as one temperature sensor
type SeriesHistory struct {
	ID      string          `json:"id"`
	Samples []HistorySample `json:"samples"`
}

// GPUHistory is the history of one GPU. Loads are percentages and power is
// in watts.
type GPUHistory struct {
	ID          string          `json:"id"`
	CoreLoad    []HistorySample `json:"core_load"`
	MemoryLoad  []HistorySample `json:"memory_load"`
	Temperature []HistorySample `json:"temperature"`
	Power       []HistorySample `json:"power"`
}

// MetricHistory is the recent history of the graphed metrics. Usage is in
// percent, temperatures in °C, frequency in MHz, power in watts, fan speeds
// in RPM, and network and disk values are rates in bytes per second.
type MetricHistory struct {
	CPU              []HistorySample `json:"cpu"`
	CPUTemperature   []HistorySample `json:"cpu_temperature"`
	CPUFrequency     []HistorySample `json:"cpu_frequency"`
	CPUPower         []HistorySample `json:"cpu_power"`
	LoadAverage      []HistorySample `json:"load_average"`
	Memory           []HistorySample `json:"memory"`
	Swap             []HistorySample `json:"swap"`
	Battery          []HistorySample `json:"battery"`
	SystemPower      []HistorySample `json:"system_power"`
	NetworkReceive   []HistorySample `json:"network_receive"`
	NetworkSend      []HistorySample `json:"network_send"`
	DiskRead         []HistorySample `json:"disk_read"`
	DiskWrite        []HistorySample `json:"disk_write"`
	DiskTemperatures []SeriesHistory `json:"disk_temperatures"`
	GPUs             []GPUHistory    `json:"gpus"`
	Temperatures     []SeriesHistory `json:"temperatures"`
	Fans             []SeriesHistory `json:"fans"`
}
