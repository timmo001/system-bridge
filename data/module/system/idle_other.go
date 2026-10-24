//go:build !linux && !windows && !darwin

package system

func GetIdleState() (*uint64, *bool) {
	return nil, nil
}
