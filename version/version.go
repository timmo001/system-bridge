package version

import (
	"os"
	"strings"

	"github.com/timmo001/system-bridge/assert"
)

func GetVersion() string {
	// Read the version from ../version.txt
	data, err := os.ReadFile("version.txt")
	assert.NoError(err, "Failed to read version file")

	version := strings.TrimSpace(string(data))
	assert.NotEmpty(version, "Version is empty")
	assert.IsSemver(version, "Version is not Semver")

	return version
}
