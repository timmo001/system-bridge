package settings

import (
	"fmt"
	"os"

	"github.com/charmbracelet/log"
	"github.com/spf13/viper"
)

type SettingsAPI struct {
	Token string `mapstructure:"token"`
	Port  int    `mapstructure:"port"`
}

type SettingsHotkey struct {
	Name string `mapstructure:"name"`
	Key  string `mapstructure:"key"`
}

type SettingsMediaDirectory struct {
	Name string `mapstructure:"name"`
	Path string `mapstructure:"path"`
}

type SettingsMedia struct {
	Directories []SettingsMediaDirectory `mapstructure:"directories"`
}

type Settings struct {
	API       SettingsAPI      `mapstructure:"api"`
	Autostart bool             `mapstructure:"autostart"`
	Hotkeys   []SettingsHotkey `mapstructure:"hotkeys"`
	LogLevel  log.Level        `mapstructure:"log_level"`
	Media     SettingsMedia    `mapstructure:"media"`
}

func Load() (*Settings, error) {
	viper.AutomaticEnv()

	viper.SetConfigName("settings")
	viper.SetConfigType("yaml")

	// (Cross platform) default config path (~/.config/system-bridge/v5 or %APPDATA%\system-bridge\v5)
	configDirPath := ""
	if os.Getenv("XDG_CONFIG_HOME") != "" {
		configDirPath = os.Getenv("XDG_CONFIG_HOME") + "/system-bridge/v5"
	} else if os.Getenv("APPDATA") != "" {
		configDirPath = os.Getenv("APPDATA") + "/system-bridge/v5"
	} else if os.Getenv("HOME") != "" {
		configDirPath = os.Getenv("HOME") + "/.config/system-bridge/v5"
	} else {
		return nil, fmt.Errorf("could not determine config path")
	}

	// Create the config directory if it doesn't exist
	os.MkdirAll(configDirPath, 0755)
	viper.AddConfigPath(configDirPath)

	// Set default values
	viper.SetDefault("api.token", GenerateToken())
	viper.SetDefault("api.port", 9170)
	viper.SetDefault("autostart", false)
	viper.SetDefault("hotkeys", []SettingsHotkey{})
	viper.SetDefault("log_level", log.InfoLevel)
	viper.SetDefault("media.directories", []SettingsMediaDirectory{})

	// Read the config file
	if err := viper.ReadInConfig(); err != nil {
		if _, ok := err.(viper.ConfigFileNotFoundError); ok {
			viper.SafeWriteConfig()
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
	viper.Set("api.token", cfg.API.Token)
	viper.Set("api.port", cfg.API.Port)
	viper.Set("autostart", cfg.Autostart)
	viper.Set("hotkeys", cfg.Hotkeys)
	viper.Set("log_level", cfg.LogLevel)
	viper.Set("media.directories", cfg.Media.Directories)

	if err := viper.WriteConfig(); err != nil {
		return fmt.Errorf("error writing config file: %w", err)
	}
	return nil
}
