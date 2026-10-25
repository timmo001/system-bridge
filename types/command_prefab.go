package types

// CommandPrefab is a ready-made command and how it would run on this system
type CommandPrefab struct {
	ID          string   `json:"id" mapstructure:"id"`
	Name        string   `json:"name" mapstructure:"name"`
	Description string   `json:"description" mapstructure:"description"`
	Available   bool     `json:"available" mapstructure:"available"`
	Command     string   `json:"command" mapstructure:"command"`     // Full path of the program it would run, empty when not available
	Arguments   []string `json:"arguments" mapstructure:"arguments"` // Arguments it would pass
	Reason      string   `json:"reason" mapstructure:"reason"`       // Why it isn't available, empty when it is
}
