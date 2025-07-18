package settings

import (
	"fmt"
	"log/slog"
	"reflect"
	"strings"

	"github.com/mitchellh/mapstructure"
	"github.com/spf13/viper"
	"github.com/timmo001/system-bridge/utils"
)

// LogLevel represents the logging level as a string enum
type LogLevel string

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

type SettingsMediaDirectory struct {
	Name string `json:"name" mapstructure:"name"`
	Path string `json:"path" mapstructure:"path"`
}

type SettingsMedia struct {
	Directories []SettingsMediaDirectory `json:"directories" mapstructure:"directories"`
}

type Settings struct {
	Autostart bool             `json:"autostart" mapstructure:"autostart"`
	Hotkeys   []SettingsHotkey `json:"hotkeys" mapstructure:"hotkeys"`
	LogLevel  LogLevel         `json:"logLevel" mapstructure:"logLevel"`
	Media     SettingsMedia    `json:"media" mapstructure:"media"`
}

func Load() (*Settings, error) {
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
	viper.SetDefault("hotkeys", []SettingsHotkey{})
	viper.SetDefault("logLevel", LogLevelInfo)
	viper.SetDefault("media.directories", []SettingsMediaDirectory{})

	// Read the config file
	if err := viper.ReadInConfig(); err != nil {
		if _, ok := err.(viper.ConfigFileNotFoundError); ok {
			if err := viper.SafeWriteConfig(); err != nil {
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
	return &cfg, nil
}

func (cfg *Settings) Save() error {
	viper.Set("autostart", cfg.Autostart)
	viper.Set("hotkeys", cfg.Hotkeys)
	viper.Set("logLevel", string(cfg.LogLevel))
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
