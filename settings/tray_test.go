package settings

import (
	"testing"

	"github.com/spf13/viper"
	"github.com/stretchr/testify/require"
)

func TestSystemTrayPreferenceSurvivesRestart(t *testing.T) {
	t.Setenv("SYSTEM_BRIDGE_CONFIG_DIR", t.TempDir())
	viper.Reset()
	t.Cleanup(viper.Reset)
	cfg, err := Load()
	require.NoError(t, err)
	require.True(t, cfg.SystemTray)

	for _, enabled := range []bool{false, true} {
		cfg.SystemTray = enabled
		require.NoError(t, cfg.Save())
		viper.Reset()
		cfg, err = Load()
		require.NoError(t, err)
		require.Equal(t, enabled, cfg.SystemTray)
	}
}
