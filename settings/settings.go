package settings

import (
	"errors"
	"fmt"
	"io/fs"
	"log/slog"
	"reflect"
	"slices"
	"strings"
	"sync"

	"github.com/go-viper/mapstructure/v2"
	"github.com/spf13/viper"
	"github.com/timmo001/system-bridge/utils"
	"github.com/timmo001/system-bridge/utils/handlers/command/prefab"
)

// LogLevel represents the logging level as a string enum
type LogLevel string

var configMu sync.Mutex

const (
	LogLevelDebug LogLevel = "DEBUG"
	LogLevelInfo  LogLevel = "INFO"
	LogLevelWarn  LogLevel = "WARN"
	LogLevelError LogLevel = "ERROR"
)

// ToSlogLevel converts LogLevel to slog.Level
func (l LogLevel) ToSlogLevel() slog.Level {
	switch l {
	case LogLevelDebug:
		return slog.LevelDebug
	case LogLevelInfo:
		return slog.LevelInfo
	case LogLevelWarn:
		return slog.LevelWarn
	case LogLevelError:
		return slog.LevelError
	default:
		return slog.LevelInfo
	}
}

// FromSlogLevel converts slog.Level to LogLevel
func FromSlogLevel(level slog.Level) LogLevel {
	switch level {
	case slog.LevelDebug:
		return LogLevelDebug
	case slog.LevelInfo:
		return LogLevelInfo
	case slog.LevelWarn:
		return LogLevelWarn
	case slog.LevelError:
		return LogLevelError
	default:
		return LogLevelInfo
	}
}

// ParseLogLevel parses a string to LogLevel
func ParseLogLevel(levelStr string) (LogLevel, error) {
	switch strings.ToUpper(levelStr) {
	case "DEBUG":
		return LogLevelDebug, nil
	case "INFO":
		return LogLevelInfo, nil
	case "WARN":
		return LogLevelWarn, nil
	case "ERROR":
		return LogLevelError, nil
	default:
		return LogLevelInfo, fmt.Errorf("invalid log level: %s", levelStr)
	}
}

type SettingsHotkey struct {
	Name string `json:"name" mapstructure:"name"`
	Key  string `json:"key" mapstructure:"key"`
}

type SettingsCommandDefinition struct {
	ID         string   `json:"id" mapstructure:"id"`
	Name       string   `json:"name" mapstructure:"name"`
	Command    string   `json:"command" mapstructure:"command"`
	WorkingDir string   `json:"workingDir" mapstructure:"workingDir"`
	Arguments  []string `json:"arguments" mapstructure:"arguments"`
	// Prefab is the ID of a ready-made command. With no Command it runs the
	// prefab's program for the platform; with one, Command and Arguments
	// replace it.
	Prefab string `json:"prefab" mapstructure:"prefab"`
}

type SettingsCommands struct {
	Allowlist []SettingsCommandDefinition `json:"allowlist" mapstructure:"allowlist"`
}

type SettingsMediaDirectory struct {
	Name string `json:"name" mapstructure:"name"`
	Path string `json:"path" mapstructure:"path"`
}

type SettingsMedia struct {
	Directories []SettingsMediaDirectory `json:"directories" mapstructure:"directories"`
}

type SettingsDisks struct {
	AllowedSecondaryMountPoints []string `json:"allowedSecondaryMountPoints" mapstructure:"allowedSecondaryMountPoints"`
}

// SettingsDesktop holds the desktop module's options. Window titles are off by
// default, as they can hold private information. Hyprland code, running
// commands, any dispatcher and Lua through Hyprland, is off by default too.
type SettingsDesktop struct {
	WindowTitles bool `json:"windowTitles" mapstructure:"windowTitles"`
	HyprlandCode bool `json:"hyprlandCode" mapstructure:"hyprlandCode"`
}

// SettingsCameras holds the cameras module's options. Taking pictures with a
// camera is off by default, as it can see the room it's in.
type SettingsCameras struct {
	Capture bool `json:"capture" mapstructure:"capture"`
}

type Settings struct {
	Autostart  bool             `json:"autostart" mapstructure:"autostart"`
	SystemTray bool             `json:"systemTray" mapstructure:"systemTray"`
	Hotkeys    []SettingsHotkey `json:"hotkeys" mapstructure:"hotkeys"`
	LogLevel   LogLevel         `json:"logLevel" mapstructure:"logLevel"`
	Cameras    SettingsCameras  `json:"cameras" mapstructure:"cameras"`
	Commands   SettingsCommands `json:"commands" mapstructure:"commands"`
	Desktop    SettingsDesktop  `json:"desktop" mapstructure:"desktop"`
	Disks      SettingsDisks    `json:"disks" mapstructure:"disks"`
	Media      SettingsMedia    `json:"media" mapstructure:"media"`
}

func Load() (*Settings, error) {
	configMu.Lock()
	defer configMu.Unlock()
	viper.AutomaticEnv()

	viper.SetConfigName("settings")
	viper.SetConfigType("json")

	configDirPath, err := utils.GetConfigPath()
	if err != nil {
		return nil, fmt.Errorf("could not get config path: %w", err)
	}
	viper.AddConfigPath(configDirPath)

	// Set default values (token and port removed)
	viper.SetDefault("autostart", false)
	viper.SetDefault("systemTray", true)
	viper.SetDefault("hotkeys", []SettingsHotkey{})
	viper.SetDefault("logLevel", LogLevelWarn)
	viper.SetDefault("cameras.capture", false)
	viper.SetDefault("desktop.windowTitles", false)
	viper.SetDefault("desktop.hyprlandCode", false)
	viper.SetDefault("disks.allowedSecondaryMountPoints", []string{})
	viper.SetDefault("media.directories", []SettingsMediaDirectory{})
	viper.SetDefault("commands.allowlist", []SettingsCommandDefinition{})

	// Read the config file
	if err := viper.ReadInConfig(); err != nil {
		if _, ok := err.(viper.ConfigFileNotFoundError); ok {
			// Another process starting at the same time may write it first,
			// which leaves the same defaults in place
			var exists viper.ConfigFileAlreadyExistsError
			if err := viper.SafeWriteConfig(); err != nil && !errors.Is(err, fs.ErrExist) && !errors.As(err, &exists) {
				return nil, fmt.Errorf("error writing default config file: %w", err)
			}
		} else {
			return nil, fmt.Errorf("error reading config file: %w", err)
		}
	}

	var cfg Settings
	// Add decode hook for LogLevel
	decoderConfig := &mapstructure.DecoderConfig{
		DecodeHook: mapstructure.ComposeDecodeHookFunc(
			func(from, to reflect.Type, data any) (any, error) {
				if to == reflect.TypeOf(LogLevel("")) {
					switch v := data.(type) {
					case string:
						parsed, err := ParseLogLevel(v)
						if err != nil {
							return LogLevelInfo, nil // fallback to info
						}
						return parsed, nil
					}
				}
				return data, nil
			},
		),
		Result:  &cfg,
		TagName: "mapstructure",
	}
	decoder, err := mapstructure.NewDecoder(decoderConfig)
	if err != nil {
		return nil, fmt.Errorf("unable to create decoder: %w", err)
	}
	if err := decoder.Decode(viper.AllSettings()); err != nil {
		return nil, fmt.Errorf("unable to decode into struct: %w", err)
	}

	cfg.Commands.Allowlist = slices.DeleteFunc(cfg.Commands.Allowlist, func(cmd SettingsCommandDefinition) bool {
		if cmd.Command != "" || !slices.Contains(prefab.Retired, cmd.Prefab) {
			return false
		}
		slog.Warn("Dropping a saved command whose prefab was removed", "id", cmd.ID, "prefab", cmd.Prefab)
		return true
	})

	// Validate settings after loading
	if err := cfg.Validate(); err != nil {
		return nil, fmt.Errorf("settings validation failed: %w", err)
	}

	return &cfg, nil
}

// Validate validates the settings structure
func (cfg *Settings) Validate() error {
	// Check for duplicate command IDs
	seenIDs := make(map[string]bool)
	for i, cmd := range cfg.Commands.Allowlist {
		if cmd.Prefab != "" {
			p, ok := prefab.Get(cmd.Prefab)
			if !ok {
				return fmt.Errorf("command at index %d: unknown prefab %q", i, cmd.Prefab)
			}
			if cmd.Command == "" {
				if err := p.ValidateArguments(cmd.Arguments); err != nil {
					return fmt.Errorf("command at index %d: %w", i, err)
				}
			}
		}

		// A prefab without a command looks up its program when it runs, so a
		// missing tool doesn't stop the settings loading
		if cmd.Prefab != "" && cmd.Command == "" {
			if cmd.ID == "" || cmd.Name == "" {
				return fmt.Errorf("command at index %d: needs an ID and a name", i)
			}
		} else if err := utils.ValidateCommand(cmd.ID, cmd.Name, cmd.Command, cmd.WorkingDir, cmd.Arguments); err != nil {
			return fmt.Errorf("command at index %d: %w", i, err)
		}

		// Check for duplicates
		if seenIDs[cmd.ID] {
			return fmt.Errorf("duplicate command ID: %s", cmd.ID)
		}
		seenIDs[cmd.ID] = true
	}

	// Validate media directories exist
	for _, dir := range cfg.Media.Directories {
		if err := utils.ValidateMediaDirectory(dir.Path); err != nil {
			return err
		}
	}

	return nil
}

func (cfg *Settings) Save() error {
	configMu.Lock()
	defer configMu.Unlock()
	// Validate settings before saving
	if err := cfg.Validate(); err != nil {
		return fmt.Errorf("settings validation failed: %w", err)
	}

	viper.Set("autostart", cfg.Autostart)
	viper.Set("systemTray", cfg.SystemTray)
	viper.Set("hotkeys", cfg.Hotkeys)
	viper.Set("logLevel", string(cfg.LogLevel))
	viper.Set("commands.allowlist", cfg.Commands.Allowlist)
	viper.Set("cameras.capture", cfg.Cameras.Capture)
	viper.Set("desktop.windowTitles", cfg.Desktop.WindowTitles)
	viper.Set("desktop.hyprlandCode", cfg.Desktop.HyprlandCode)
	viper.Set("disks.allowedSecondaryMountPoints", cfg.Disks.AllowedSecondaryMountPoints)
	viper.Set("media.directories", cfg.Media.Directories)

	if err := viper.WriteConfig(); err != nil {
		if _, ok := err.(viper.ConfigFileNotFoundError); ok {
			if err := viper.SafeWriteConfig(); err != nil {
				return fmt.Errorf("error writing config file: %w", err)
			}
		} else {
			return fmt.Errorf("error writing config file: %w", err)
		}
	}
	return nil
}
