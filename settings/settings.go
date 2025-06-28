package settings

import (
	"fmt"

	"github.com/charmbracelet/log"
	"github.com/spf13/viper"
	"github.com/timmo001/system-bridge/utils"
)

type SettingsAPI struct {
	Token string `json:"token" mapstructure:"token"`
	Port  int    `json:"port" mapstructure:"port"`
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

type SettingsCommand struct {
	Name        string   `json:"name" mapstructure:"name"`
	Description string   `json:"description" mapstructure:"description"`
	Command     string   `json:"command" mapstructure:"command"`
	Args        []string `json:"args" mapstructure:"args"`
	Enabled     bool     `json:"enabled" mapstructure:"enabled"`
}

type SettingsCommands struct {
	Commands []SettingsCommand `json:"commands" mapstructure:"commands"`
}

type Settings struct {
	API       SettingsAPI      `json:"api" mapstructure:"api"`
	Autostart bool             `json:"autostart" mapstructure:"autostart"`
	Commands  SettingsCommands `json:"commands" mapstructure:"commands"`
	Hotkeys   []SettingsHotkey `json:"hotkeys" mapstructure:"hotkeys"`
	LogLevel  log.Level        `json:"log_level" mapstructure:"log_level"`
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

	// Set default values
	viper.SetDefault("api.token", utils.GenerateToken())
	viper.SetDefault("api.port", 9170)
	viper.SetDefault("autostart", false)
	viper.SetDefault("commands.commands", []SettingsCommand{})
	viper.SetDefault("hotkeys", []SettingsHotkey{})
	viper.SetDefault("log_level", log.InfoLevel)
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
	viper.Set("api.token", cfg.API.Token)
	viper.Set("api.port", cfg.API.Port)
	viper.Set("autostart", cfg.Autostart)
	viper.Set("commands.commands", cfg.Commands.Commands)
	viper.Set("hotkeys", cfg.Hotkeys)
	viper.Set("log_level", cfg.LogLevel)
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
