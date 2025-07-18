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
	LogLevel  slog.Level       `json:"logLevel" mapstructure:"logLevel"`
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
	viper.SetDefault("logLevel", slog.LevelInfo)
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
	// Add decode hook for slog.Level
	decoderConfig := &mapstructure.DecoderConfig{
		DecodeHook: mapstructure.ComposeDecodeHookFunc(
			func(from, to reflect.Type, data any) (any, error) {
				if to == reflect.TypeOf(slog.Level(0)) {
					switch v := data.(type) {
					case string:
						parsed, err := ParseSlogLevel(v)
						if err != nil {
							return slog.LevelInfo, nil // fallback to info
						}
						return parsed, nil
					case int, int8, int16, int32, int64, float64, float32:
						return slog.Level(reflect.ValueOf(v).Convert(reflect.TypeOf(int64(0))).Int()), nil
					}
				}
				return data, nil
			},
		),
		Result: &cfg,
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
	viper.Set("logLevel", int64(cfg.LogLevel))
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

// Helper to parse slog.Level from string (since slog does not provide ParseLevel)
func ParseSlogLevel(levelStr string) (slog.Level, error) {
	switch strings.ToLower(levelStr) {
	case "debug":
		return slog.LevelDebug, nil
	case "info":
		return slog.LevelInfo, nil
	case "warn":
		return slog.LevelWarn, nil
	case "error":
		return slog.LevelError, nil
	default:
		return slog.LevelInfo, fmt.Errorf("invalid log level: %s", levelStr)
	}
}
