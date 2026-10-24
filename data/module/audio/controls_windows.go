//go:build windows

package audio

import (
	"context"
	"fmt"
	"syscall"
	"unsafe"

	"github.com/go-ole/go-ole"
	"github.com/moutend/go-wca/pkg/wca"
)

// IPolicyConfig is the undocumented interface Windows' own sound settings use
// to change the default device. go-wca doesn't wrap it.
var (
	clsidPolicyConfigClient = ole.NewGUID("{870AF99C-171D-4F9E-AF0D-E63DF40C2BC9}")
	iidPolicyConfig         = ole.NewGUID("{F8679F50-850A-41CF-9C72-430F290290C8}")
)

// policyConfigSetDefaultEndpoint is SetDefaultEndpoint's place in the
// IPolicyConfig vtable, after IUnknown's 3 methods and 10 others
const policyConfigSetDefaultEndpoint = 13

// eRoleCount is the number of ERole values: console, multimedia and
// communications
const eRoleCount = 3

// SetVolume sets an output's or input's master volume, in percent
func SetVolume(_ context.Context, id string, volume float64) error {
	return withEndpointVolume(id, func(endpoint *wca.IAudioEndpointVolume) error {
		if err := endpoint.SetMasterVolumeLevelScalar(float32(volume/100), nil); err != nil {
			return fmt.Errorf("setting the volume: %w", err)
		}
		return nil
	})
}

// SetMuted mutes or unmutes an output or input
func SetMuted(_ context.Context, id string, muted bool) error {
	return withEndpointVolume(id, func(endpoint *wca.IAudioEndpointVolume) error {
		if err := endpoint.SetMute(muted, nil); err != nil {
			return fmt.Errorf("setting mute: %w", err)
		}
		return nil
	})
}

// SetDefault makes an output or input the default for every role, as the
// sound settings do
func SetDefault(_ context.Context, id string) error {
	return withEnumerator(func(enumerator *wca.IMMDeviceEnumerator) error {
		device, err := deviceByID(enumerator, id)
		if err != nil {
			return err
		}
		device.Release()

		unknown, err := ole.CreateInstance(clsidPolicyConfigClient, iidPolicyConfig)
		if err != nil {
			return fmt.Errorf("creating the policy config client: %w", err)
		}
		defer unknown.Release()

		wideID, err := syscall.UTF16PtrFromString(id)
		if err != nil {
			return err
		}
		vtable := (*[policyConfigSetDefaultEndpoint + 1]uintptr)(unsafe.Pointer(unknown.RawVTable))
		for role := uintptr(0); role < eRoleCount; role++ {
			hr, _, _ := syscall.SyscallN(vtable[policyConfigSetDefaultEndpoint], uintptr(unsafe.Pointer(unknown)), uintptr(unsafe.Pointer(wideID)), role)
			if hr != 0 {
				return fmt.Errorf("setting the default device: %w", ole.NewError(hr))
			}
		}
		return nil
	})
}

func withEndpointVolume(id string, fn func(*wca.IAudioEndpointVolume) error) error {
	return withEnumerator(func(enumerator *wca.IMMDeviceEnumerator) error {
		device, err := deviceByID(enumerator, id)
		if err != nil {
			return err
		}
		defer device.Release()

		var endpoint *wca.IAudioEndpointVolume
		if err := device.Activate(wca.IID_IAudioEndpointVolume, wca.CLSCTX_ALL, nil, &endpoint); err != nil {
			return fmt.Errorf("opening the device's volume: %w", err)
		}
		defer endpoint.Release()

		return fn(endpoint)
	})
}

// deviceByID calls IMMDeviceEnumerator::GetDevice, which go-wca doesn't
// implement
func deviceByID(enumerator *wca.IMMDeviceEnumerator, id string) (*wca.IMMDevice, error) {
	wideID, err := syscall.UTF16PtrFromString(id)
	if err != nil {
		return nil, err
	}
	var device *wca.IMMDevice
	hr, _, _ := syscall.SyscallN(enumerator.VTable().GetDevice, uintptr(unsafe.Pointer(enumerator)), uintptr(unsafe.Pointer(wideID)), uintptr(unsafe.Pointer(&device)))
	if hr != 0 {
		return nil, fmt.Errorf("%w: %w", ErrUnknownDevice, ole.NewError(hr))
	}
	return device, nil
}
