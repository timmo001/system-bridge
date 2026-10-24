package types

// BluetoothDevice is a paired Bluetooth device
type BluetoothDevice struct {
	Address   string  `json:"address" mapstructure:"address"`
	Name      string  `json:"name" mapstructure:"name"`
	Type      *string `json:"type" mapstructure:"type"` // A freedesktop icon name, such as audio-headset or input-mouse
	Connected bool    `json:"connected" mapstructure:"connected"`
}

// BluetoothData lists the system's paired Bluetooth devices
type BluetoothData struct {
	Devices []BluetoothDevice `json:"devices" mapstructure:"devices"`
}
