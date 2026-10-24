//go:build windows

package audio

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"math"
	"runtime"

	"github.com/go-ole/go-ole"
	"github.com/moutend/go-wca/pkg/wca"

	"github.com/timmo001/system-bridge/types"
)

// sFalse is the S_FALSE result CoInitializeEx returns when COM is already
// set up on the thread, which still needs a matching CoUninitialize
const sFalse = 1

// GetAudioData reads the active outputs and inputs through Core Audio
func GetAudioData(context.Context) (types.AudioData, error) {
	var data types.AudioData
	err := withEnumerator(func(enumerator *wca.IMMDeviceEnumerator) error {
		outputs, err := devices(enumerator, wca.ERender)
		if err != nil {
			return err
		}
		inputs, err := devices(enumerator, wca.ECapture)
		if err != nil {
			return err
		}
		data = types.AudioData{Outputs: outputs, Inputs: inputs}
		return nil
	})
	return data, err
}

// withEnumerator sets up COM on this thread and runs fn with a device
// enumerator
func withEnumerator(fn func(*wca.IMMDeviceEnumerator) error) error {
	// COM is set up per OS thread, so keep this goroutine on one thread
	runtime.LockOSThread()
	defer runtime.UnlockOSThread()

	if err := ole.CoInitializeEx(0, ole.COINIT_APARTMENTTHREADED); err != nil {
		var oleErr *ole.OleError
		if !errors.As(err, &oleErr) || oleErr.Code() != sFalse {
			return fmt.Errorf("initialising COM: %w", err)
		}
	}
	defer ole.CoUninitialize()

	var enumerator *wca.IMMDeviceEnumerator
	if err := wca.CoCreateInstance(wca.CLSID_MMDeviceEnumerator, 0, wca.CLSCTX_ALL, wca.IID_IMMDeviceEnumerator, &enumerator); err != nil {
		return fmt.Errorf("creating the device enumerator: %w", err)
	}
	defer enumerator.Release()

	return fn(enumerator)
}

// devices lists the active endpoints that flow one way, ERender for outputs or
// ECapture for inputs
func devices(enumerator *wca.IMMDeviceEnumerator, flow uint32) ([]types.AudioDevice, error) {
	var collection *wca.IMMDeviceCollection
	if err := enumerator.EnumAudioEndpoints(flow, wca.DEVICE_STATE_ACTIVE, &collection); err != nil {
		return nil, fmt.Errorf("listing audio endpoints: %w", err)
	}
	defer collection.Release()

	var count uint32
	if err := collection.GetCount(&count); err != nil {
		return nil, fmt.Errorf("counting audio endpoints: %w", err)
	}

	// There's no default when no device of this kind is connected
	defaultID := ""
	var defaultDevice *wca.IMMDevice
	if err := enumerator.GetDefaultAudioEndpoint(flow, wca.EConsole, &defaultDevice); err == nil {
		if err := defaultDevice.GetId(&defaultID); err != nil {
			slog.Debug("Failed to read the default audio endpoint's ID", "error", err)
		}
		defaultDevice.Release()
	}

	list := make([]types.AudioDevice, 0, count)
	for i := uint32(0); i < count; i++ {
		var device *wca.IMMDevice
		if err := collection.Item(i, &device); err != nil {
			slog.Debug("Failed to read an audio endpoint", "index", i, "error", err)
			continue
		}
		if d, ok := readDevice(device, defaultID); ok {
			list = append(list, d)
		}
		device.Release()
	}
	return list, nil
}

func readDevice(device *wca.IMMDevice, defaultID string) (types.AudioDevice, bool) {
	var id string
	if err := device.GetId(&id); err != nil {
		slog.Debug("Failed to read an audio endpoint's ID", "error", err)
		return types.AudioDevice{}, false
	}
	d := types.AudioDevice{ID: id, Name: id, Default: id == defaultID}

	var store *wca.IPropertyStore
	if err := device.OpenPropertyStore(wca.STGM_READ, &store); err == nil {
		var name wca.PROPVARIANT
		if err := store.GetValue(&wca.PKEY_Device_FriendlyName, &name); err == nil {
			if s := name.String(); s != "" {
				d.Name = s
			}
		}
		store.Release()
	}

	var volume *wca.IAudioEndpointVolume
	if err := device.Activate(wca.IID_IAudioEndpointVolume, wca.CLSCTX_ALL, nil, &volume); err != nil {
		slog.Debug("Failed to read an audio endpoint's volume", "id", id, "error", err)
		return d, true
	}
	defer volume.Release()

	var level float32
	if err := volume.GetMasterVolumeLevelScalar(&level); err == nil {
		percent := math.Round(float64(level) * 100)
		d.Volume = &percent
	}
	var muted bool
	if err := volume.GetMute(&muted); err == nil {
		d.Muted = &muted
	}
	return d, true
}
