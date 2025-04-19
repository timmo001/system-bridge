package types

// SensorsWindowsSensor represents a Windows sensor
type SensorsWindowsSensor struct {
	ID    string      `json:"id"`
	Name  string      `json:"name"`
	Type  string      `json:"type"`
	Value interface{} `json:"value"`
}

// SensorsWindowsHardware represents Windows hardware sensor information
type SensorsWindowsHardware struct {
	ID          string                   `json:"id"`
	Name        string                   `json:"name"`
	Type        string                   `json:"type"`
	Subhardware []SensorsWindowsHardware `json:"subhardware"`
	Sensors     []SensorsWindowsSensor   `json:"sensors"`
}

// SensorsNVIDIAChipset represents NVIDIA chipset information
type SensorsNVIDIAChipset struct {
	ID         int    `json:"id"`
	Name       string `json:"name"`
	Flags      string `json:"flags"`
	VendorID   int    `json:"vendor_id"`
	VendorName string `json:"vendor_name"`
}

// SensorsNVIDIADisplay represents NVIDIA display information
type SensorsNVIDIADisplay struct {
	ID                   int    `json:"id"`
	Name                 string `json:"name"`
	Active               bool   `json:"active"`
	Available            bool   `json:"available"`
	Connected            bool   `json:"connected"`
	Dynamic              bool   `json:"dynamic"`
	AspectHorizontal     int    `json:"aspect_horizontal"`
	AspectVertical       int    `json:"aspect_vertical"`
	BrightnessCurrent    int    `json:"brightness_current"`
	BrightnessDefault    int    `json:"brightness_default"`
	BrightnessMax        int    `json:"brightness_max"`
	BrightnessMin        int    `json:"brightness_min"`
	ColorDepth           string `json:"color_depth"`
	ConnectionType       string `json:"connection_type"`
	PixelClock           int    `json:"pixel_clock"`
	RefreshRate          int    `json:"refresh_rate"`
	ResolutionHorizontal int    `json:"resolution_horizontal"`
	ResolutionVertical   int    `json:"resolution_vertical"`
}

// SensorsNVIDIADriver represents NVIDIA driver information
type SensorsNVIDIADriver struct {
	BranchVersion    string `json:"branch_version"`
	InterfaceVersion string `json:"interface_version"`
	Version          int    `json:"version"`
}

// SensorsNVIDIAGPU represents NVIDIA GPU information
type SensorsNVIDIAGPU struct {
	ID                   int     `json:"id"`
	Name                 string  `json:"name"`
	BiosOEMRevision      *int    `json:"bios_oem_revision"`
	BiosRevision         *int    `json:"bios_revision"`
	BiosVersion          *string `json:"bios_version"`
	CurrentFanSpeedLevel *int    `json:"current_fan_speed_level"`
	CurrentFanSpeedRPM   *int    `json:"current_fan_speed_rpm"`
	DriverModel          *int    `json:"driver_model"`
	MemoryAvailable      *int    `json:"memory_available"`
	MemoryCapacity       *int    `json:"memory_capacity"`
	MemoryMaker          *string `json:"memory_maker"`
	Serial               *string `json:"serial"`
	SystemType           *string `json:"system_type"`
	Type                 *string `json:"type"`
}

// SensorsNVIDIA represents all NVIDIA sensor information
type SensorsNVIDIA struct {
	Chipset  *SensorsNVIDIAChipset  `json:"chipset"`
	Displays []SensorsNVIDIADisplay `json:"displays"`
	Driver   *SensorsNVIDIADriver   `json:"driver"`
	GPUs     []SensorsNVIDIAGPU     `json:"gpus"`
}

// SensorsWindows represents Windows sensor information
type SensorsWindows struct {
	Hardware []SensorsWindowsHardware `json:"hardware"`
	NVIDIA   *SensorsNVIDIA           `json:"nvidia"`
}

type Temperature struct {
	SensorKey   string  `json:"key"`
	Temperature float64 `json:"temperature"`
	High        float64 `json:"high"`
	Critical    float64 `json:"critical"`
}

// SensorsData represents all sensor information
type SensorsData struct {
	// TODO: Add fans model
	Fans           any             `json:"fans"`
	Temperatures   []Temperature   `json:"temperatures"`
	WindowsSensors *SensorsWindows `json:"windows_sensors"`
}
