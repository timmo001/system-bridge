package types

// InputStatus says which backend presses keys and moves the pointer, or why
// none can
type InputStatus struct {
	Available bool    `json:"available" mapstructure:"available"`
	Backend   *string `json:"backend" mapstructure:"backend"` // wayland, libei, x11 or robotgo
	Reason    *string `json:"reason" mapstructure:"reason"`   // Why none can, when not available
}
