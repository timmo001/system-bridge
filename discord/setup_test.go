package discord

import (
	"os"
	"path/filepath"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestSaveCredentials(t *testing.T) {
	dir := t.TempDir()
	t.Setenv("SYSTEM_BRIDGE_CONFIG_DIR", dir)

	t.Run("refuses a client ID that isn't a snowflake", func(t *testing.T) {
		err := SaveCredentials(Credentials{ClientID: "my-app", ClientSecret: "secret"})
		require.Error(t, err)
		assert.NoFileExists(t, filepath.Join(dir, "discord.json"))
	})

	t.Run("refuses an empty secret", func(t *testing.T) {
		err := SaveCredentials(Credentials{ClientID: "123456789012345678", ClientSecret: "  "})
		require.Error(t, err)
	})

	t.Run("saves trimmed credentials only the user can read", func(t *testing.T) {
		require.NoError(t, SaveCredentials(Credentials{
			ClientID:     " 123456789012345678 ",
			ClientSecret: "secret\n",
		}))

		info, err := os.Stat(filepath.Join(dir, "discord.json"))
		require.NoError(t, err)
		assert.Equal(t, os.FileMode(0600), info.Mode().Perm())

		creds, err := loadCredentials()
		require.NoError(t, err)
		assert.Equal(t, &Credentials{ClientID: "123456789012345678", ClientSecret: "secret"}, creds)

		setup := GetSetup()
		assert.True(t, setup.Configured)
		assert.Equal(t, "123456789012345678", setup.ClientID)
		assert.Equal(t, redirectURI, setup.RedirectURI)
	})

	t.Run("drops the token when the application changes", func(t *testing.T) {
		require.NoError(t, saveToken(&oauthToken{AccessToken: "old"}))

		require.NoError(t, SaveCredentials(Credentials{
			ClientID:     "876543210987654321",
			ClientSecret: "other",
		}))

		assert.NoFileExists(t, filepath.Join(dir, "discord-token.json"))
	})
}
