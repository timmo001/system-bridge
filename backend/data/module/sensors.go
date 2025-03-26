package data_module

import "github.com/charmbracelet/log"

// SensorsWindowsSensor represents a Windows sensor
type SensorsWindowsSensor struct {
	ID    string      `json:"id"`
	Name  string      `json:"name"`
	Type  string      `json:"type"`
	Value interface{} `json:"value,omitempty"`
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
	BiosOEMRevision      *int    `json:"bios_oem_revision,omitempty"`
	BiosRevision         *int    `json:"bios_revision,omitempty"`
	BiosVersion          *string `json:"bios_version,omitempty"`
	CurrentFanSpeedLevel *int    `json:"current_fan_speed_level,omitempty"`
	CurrentFanSpeedRPM   *int    `json:"current_fan_speed_rpm,omitempty"`
	DriverModel          *int    `json:"driver_model,omitempty"`
	MemoryAvailable      *int    `json:"memory_available,omitempty"`
	MemoryCapacity       *int    `json:"memory_capacity,omitempty"`
	MemoryMaker          *string `json:"memory_maker,omitempty"`
	Serial               *string `json:"serial,omitempty"`
	SystemType           *string `json:"system_type,omitempty"`
	Type                 *string `json:"type,omitempty"`
}

// SensorsNVIDIA represents all NVIDIA sensor information
type SensorsNVIDIA struct {
	Chipset  *SensorsNVIDIAChipset  `json:"chipset,omitempty"`
	Displays []SensorsNVIDIADisplay `json:"displays,omitempty"`
	Driver   *SensorsNVIDIADriver   `json:"driver,omitempty"`
	GPUs     []SensorsNVIDIAGPU     `json:"gpus,omitempty"`
}

// SensorsWindows represents Windows sensor information
type SensorsWindows struct {
	Hardware []SensorsWindowsHardware `json:"hardware,omitempty"`
	NVIDIA   *SensorsNVIDIA           `json:"nvidia,omitempty"`
}

// SensorsData represents all sensor information
type SensorsData struct {
	// TODO: Add fans model
	Fans interface{} `json:"fans,omitempty"`
	// TODO: Add temperatures model
	Temperatures   interface{}     `json:"temperatures,omitempty"`
	WindowsSensors *SensorsWindows `json:"windows_sensors,omitempty"`
}

func (t *Module) UpdateSensorsModule() (SensorsData, error) {
	log.Info("Getting sensors data")

	// TODO: Implement
	return SensorsData{}, nil
}
