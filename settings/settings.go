package settings

import (
	"fmt"

	"github.com/charmbracelet/log"
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
	LogLevel  log.Level        `json:"logLevel" mapstructure:"logLevel"`
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
	viper.SetDefault("logLevel", log.InfoLevel)
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
	if err := viper.Unmarshal(&cfg); err != nil {
		return nil, fmt.Errorf("unable to decode into struct: %w", err)
	}

	return &cfg, nil
}

func (cfg *Settings) Save() error {
	viper.Set("autostart", cfg.Autostart)
	viper.Set("hotkeys", cfg.Hotkeys)
	viper.Set("logLevel", cfg.LogLevel)
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
