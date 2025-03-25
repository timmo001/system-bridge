package settings

import (
	"fmt"
	"os"

	"github.com/charmbracelet/log"
	"github.com/spf13/viper"
)

type ConfigAPI struct {
	Token string `mapstructure:"token"`
	Port  int    `mapstructure:"port"`
}

type ConfigHotkey struct {
	Name string `mapstructure:"name"`
	Key  string `mapstructure:"key"`
}

type ConfigMediaDirectory struct {
	Name string `mapstructure:"name"`
	Path string `mapstructure:"path"`
}

type ConfigMedia struct {
	Directories []ConfigMediaDirectory `mapstructure:"directories"`
}

type Config struct {
	API       ConfigAPI      `mapstructure:"api"`
	Autostart bool           `mapstructure:"autostart"`
	Hotkeys   []ConfigHotkey `mapstructure:"hotkeys"`
	LogLevel  log.Level      `mapstructure:"log_level"`
	Media     ConfigMedia    `mapstructure:"media"`
}

func Load() (*Config, error) {
	viper.AutomaticEnv()

	viper.SetConfigName("config.yml")
	viper.SetConfigType("yaml")

	// (Cross platform) default config configDirPath (~/.config/system-bridge or %APPDATA%\system-bridge)
	configDirPath := ""
	if os.Getenv("XDG_CONFIG_HOME") != "" {
		configDirPath = os.Getenv("XDG_CONFIG_HOME") + "/system-bridge"
	} else if os.Getenv("APPDATA") != "" {
		configDirPath = os.Getenv("APPDATA") + "/system-bridge"
	} else if os.Getenv("HOME") != "" {
		configDirPath = os.Getenv("HOME") + "/.config/system-bridge"
	} else {
		return nil, fmt.Errorf("Could not determine config path")
	}

	// Create the config directory if it doesn't exist
	os.MkdirAll(configDirPath, 0755)
	// os.WriteFile(configDirPath+"/config.yml", []byte{}, 0644)
	viper.AddConfigPath(configDirPath)

	// Set default values
	viper.SetDefault("api.token", GenerateToken())
	viper.SetDefault("api.port", 9170)
	viper.SetDefault("autostart", false)
	viper.SetDefault("hotkeys", []ConfigHotkey{})
	viper.SetDefault("log_level", "info")
	viper.SetDefault("media.directories", []ConfigMediaDirectory{})

	// Read the config file
	if err := viper.ReadInConfig(); err != nil {
		return nil, fmt.Errorf("error reading config file: %w", err)
	}

	var cfg Config
	if err := viper.Unmarshal(&cfg); err != nil {
		return nil, fmt.Errorf("unable to decode into struct: %w", err)
	}

	return &cfg, nil
}

func (cfg *Config) Save() error {
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
