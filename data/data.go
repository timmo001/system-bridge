package data

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"hash/fnv"
	"os"
	"path/filepath"
	"sync"
	"time"

	"log/slog"

	"github.com/timmo001/system-bridge/bus"
	data_module "github.com/timmo001/system-bridge/data/module"
	"github.com/timmo001/system-bridge/types"
	"github.com/timmo001/system-bridge/utils"
)

type DataStore struct {
	mu       sync.RWMutex
	registry map[types.ModuleName]types.Module
	// saved holds a hash of each module's data as last written to disk, so
	// an update that changed nothing does not rewrite the file.
	saved map[types.ModuleName]uint64
	// history keeps the recent readings of the graphed metrics
	history *History
}

// lazyModules register when they first receive data instead of at startup.
// Use this for integrations that only exist once the user sets them up, so
// an unused one adds no data or broadcasts.
var lazyModules = map[types.ModuleName]types.Updater{
	types.ModuleDiscord: data_module.DiscordModule{},
}

func NewDataStore() (*DataStore, error) {
	ds := &DataStore{
		registry: make(map[types.ModuleName]types.Module, 0),
		history:  NewHistory(),
	}

	// Register all modules with validation
	modules := []types.Updater{
		data_module.AudioModule{},
		data_module.BatteryModule{},
		data_module.BluetoothModule{},
		data_module.CPUModule{},
		data_module.DiskModule{},
		data_module.DisplayModule{},
		data_module.GPUModule{},
		data_module.MediaModule{},
		data_module.MemoryModule{},
		data_module.NetworkModule{},
		data_module.ProcessModule{},
		data_module.SensorModule{},
		data_module.SystemModule{},
	}

	for _, module := range modules {
		if module == nil {
			slog.Error("Attempting to register nil module")
			continue
		}
		ds.Register(module)
	}

	return ds, nil
}

func (d *DataStore) Register(u types.Updater) {
	d.mu.Lock()
	defer d.mu.Unlock()

	// Validate updater
	if u == nil {
		slog.Error("Cannot register nil updater")
		return
	}

	moduleName := u.Name()
	if moduleName == "" {
		slog.Error("Cannot register updater with empty name")
		return
	}

	slog.Info("Registering data module", "module", moduleName)

	d.registry[moduleName] = types.Module{Updater: u, Name: moduleName}
}

func (d *DataStore) GetModule(name types.ModuleName) (types.Module, error) {
	d.mu.Lock()
	defer d.mu.Unlock()

	// Validate module name
	if name == "" {
		return types.Module{}, fmt.Errorf("module name cannot be empty")
	}

	module, ok := d.registry[name]
	if !ok {
		return types.Module{}, fmt.Errorf("%s not found in registry", name)
	}

	// If the module data is nil, refresh the data
	if module.Data == nil {
		slog.Debug("Module data is nil, refreshing data", "module", module.Name)
		if err := d.loadModuleData(&module); err != nil {
			slog.Error("Error loading module data", "module", module.Name, "error", err)
		} else {
			// Save the updated module back to the registry
			d.registry[name] = module
		}
	}

	return module, nil
}
func (d *DataStore) SetModuleData(name types.ModuleName, data any) error {
	d.mu.Lock()
	defer d.mu.Unlock()

	// Validate module name
	if name == "" {
		return fmt.Errorf("module name cannot be empty")
	}

	module, ok := d.registry[name]
	if !ok {
		u, lazy := lazyModules[name]
		if !lazy {
			return fmt.Errorf("%s not found in registry", name)
		}
		slog.Info("Registering data module", "module", name)
		module = types.Module{Updater: u, Name: name}
	}

	// Validate module updater
	if module.Updater == nil {
		return fmt.Errorf("module updater is nil for %s", name)
	}

	now := time.Now()
	module.Data = data
	module.Updated = now.Format(time.RFC3339)
	if err := d.saveModuleData(module); err != nil {
		return err
	}

	// Record before broadcasting, so a client that asks for the history
	// when the update arrives gets this reading too
	d.history.Record(data, now)

	// Broadcast the module data update event
	if eb := bus.GetInstance(); eb != nil {
		// Create a safe copy of the module for broadcasting
		safeModule := types.Module{
			Name:    module.Name,
			Data:    module.Data,
			Updated: module.Updated,
		}

		eb.Publish(bus.Event{
			Type: bus.EventDataModuleUpdate,
			Data: safeModule,
		})
	}

	d.registry[name] = module

	return nil
}

func (d *DataStore) GetRegisteredModules() []types.Updater {
	d.mu.Lock()
	defer d.mu.Unlock()

	updaters := make([]types.Updater, 0)
	for _, module := range d.registry {
		// Skip modules with nil updaters
		if module.Updater == nil {
			slog.Warn("Skipping module with nil updater", "module", module.Name)
			continue
		}
		updaters = append(updaters, module.Updater)
	}
	return updaters
}

func (d *DataStore) GetAllModuleData() map[types.ModuleName]any {
	d.mu.RLock()
	defer d.mu.RUnlock()

	data := make(map[types.ModuleName]any, len(d.registry))

	for _, module := range d.registry {
		// Skip modules with nil updaters
		if module.Updater == nil {
			slog.Warn("Skipping module with nil updater in GetAllModuleData", "module", module.Name)
			continue
		}
		data[module.Updater.Name()] = module.Data
	}

	return data
}

// GetHistory returns the graphed metrics' readings taken after a time, in
// Unix milliseconds. Zero returns them all. With modules, only those
// modules' readings are returned.
func (d *DataStore) GetHistory(since int64, modules ...types.ModuleName) types.MetricHistory {
	return d.history.Since(since, modules...)
}

// History is the store's history, for saving it
func (d *DataStore) History() *History {
	return d.history
}

// persistedModule is the on-disk shape of a module's last data. It matches
// the files written by earlier releases, so existing data files still load.
type persistedModule struct {
	Name    types.ModuleName `json:"module"`
	Data    json.RawMessage  `json:"data"`
	Updated string           `json:"updated"`
}

func moduleDataFile(name types.ModuleName) (string, error) {
	dataPath, err := utils.GetDataPath()
	if err != nil {
		return "", fmt.Errorf("could not get data path: %w", err)
	}
	return filepath.Join(dataPath, string(name)+".json"), nil
}

// loadModuleData loads the module data from a JSON file
func (d *DataStore) loadModuleData(m *types.Module) error {
	if m == nil {
		return fmt.Errorf("module is nil")
	}

	if m.Name == "" {
		return fmt.Errorf("module name cannot be empty")
	}

	file, err := moduleDataFile(m.Name)
	if err != nil {
		return err
	}

	b, err := os.ReadFile(file)
	if err != nil {
		if errors.Is(err, os.ErrNotExist) {
			// No data saved yet, use default values
			return nil
		}
		return fmt.Errorf("error reading data file: %w", err)
	}

	var stored persistedModule
	if err := json.Unmarshal(b, &stored); err != nil {
		return fmt.Errorf("unable to decode data file: %w", err)
	}
	if len(stored.Data) > 0 {
		if err := json.Unmarshal(stored.Data, &m.Data); err != nil {
			return fmt.Errorf("unable to decode data file: %w", err)
		}
	}
	m.Updated = stored.Updated

	return nil
}

// saveModuleData saves the module data to a JSON file. It encodes with
// encoding/json and replaces the file atomically, which is far cheaper than
// going through a configuration library for every update, and skips the
// write when the data is the same as last time.
func (d *DataStore) saveModuleData(m types.Module) error {
	// Validate module
	if m.Name == "" {
		return fmt.Errorf("module name cannot be empty")
	}

	data, err := json.Marshal(m.Data)
	if err != nil {
		return fmt.Errorf("error encoding data file: %w", err)
	}
	hash := fnv.New64a()
	_, _ = hash.Write(data)
	sum := hash.Sum64()
	if prev, ok := d.saved[m.Name]; ok && prev == sum {
		return nil
	}

	file, err := moduleDataFile(m.Name)
	if err != nil {
		return err
	}

	b, err := json.Marshal(persistedModule{Name: m.Name, Data: data, Updated: m.Updated})
	if err != nil {
		return fmt.Errorf("error encoding data file: %w", err)
	}

	tmp := file + ".tmp"
	if err := os.WriteFile(tmp, b, 0o600); err != nil {
		return fmt.Errorf("error writing data file: %w", err)
	}
	if err := os.Rename(tmp, file); err != nil {
		_ = os.Remove(tmp)
		return fmt.Errorf("error writing data file: %w", err)
	}

	if d.saved == nil {
		d.saved = make(map[types.ModuleName]uint64)
	}
	d.saved[m.Name] = sum

	return nil
}

// TriggerModuleUpdate triggers an update for a specific module and broadcasts the update
func (d *DataStore) TriggerModuleUpdate(name types.ModuleName) error {
	d.mu.Lock()
	defer d.mu.Unlock()

	// Validate module name
	if name == "" {
		return fmt.Errorf("module name cannot be empty")
	}

	module, ok := d.registry[name]
	if !ok {
		return fmt.Errorf("%s not found in registry", name)
	}

	// Validate module updater
	if module.Updater == nil {
		return fmt.Errorf("module updater is nil for %s", name)
	}

	// Update the module data
	ctx := context.Background()
	data, err := module.Updater.Update(ctx)
	if err != nil {
		return fmt.Errorf("failed to update module %s: %w", name, err)
	}

	// Set the updated data
	now := time.Now()
	module.Data = data
	module.Updated = now.Format(time.RFC3339)

	// Save the module data
	if err := d.saveModuleData(module); err != nil {
		return err
	}

	d.history.Record(data, now)

	// Broadcast the module data update event
	if eb := bus.GetInstance(); eb != nil {
		// Create a safe copy of the module for broadcasting
		safeModule := types.Module{
			Name:    module.Name,
			Data:    module.Data,
			Updated: module.Updated,
		}

		eb.Publish(bus.Event{
			Type: bus.EventDataModuleUpdate,
			Data: safeModule,
		})
	}

	d.registry[name] = module

	return nil
}
