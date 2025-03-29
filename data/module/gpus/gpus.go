package gpus

import (
	"github.com/timmo001/system-bridge/types"
)

// GetGPUs returns information about all GPU devices
func GetGPUs() ([]types.GPU, error) {
	return getGPUs()
}
