package data

import (
	"fmt"
	"sync"
	"time"

	"log/slog"

	"github.com/spf13/viper"
	"github.com/timmo001/system-bridge/bus"
	data_module "github.com/timmo001/system-bridge/data/module"
	"github.com/timmo001/system-bridge/types"
	"github.com/timmo001/system-bridge/utils"
)

type DataStore struct {
	mu       sync.RWMutex
	registry map[types.ModuleName]types.Module
}

func NewDataStore() (*DataStore, error) {
	ds := &DataStore{registry: make(map[types.ModuleName]types.Module, 0)}

	ds.Register(data_module.BatteryModule{})
	ds.Register(data_module.CPUModule{})
	ds.Register(data_module.DiskModule{})
	ds.Register(data_module.DisplayModule{})
	ds.Register(data_module.GPUModule{})
	ds.Register(data_module.MediaModule{})
	ds.Register(data_module.MemoryModule{})
	ds.Register(data_module.NetworkModule{})
	ds.Register(data_module.ProcessModule{})
	ds.Register(data_module.SensorModule{})
	ds.Register(data_module.SystemModule{})

	return ds, nil
}

func (d *DataStore) Register(u types.Updater) {
	d.mu.Lock()
	defer d.mu.Unlock()
	slog.Info("Registering data module", "module", u.Name())

	d.registry[u.Name()] = types.Module{Updater: u, Name: u.Name()}
}

func (d *DataStore) GetModule(name types.ModuleName) (types.Module, error) {

	module, ok := d.registry[name]
	if !ok {
		return types.Module{}, fmt.Errorf("%s not found in registry", name)
	}

	// If the module data is nil, refresh the data
	if module.Data == nil {
		slog.Info("Module data is nil, refreshing data", "module", module.Name)
		if err := d.loadModuleData(&module); err != nil {
			slog.Error("Error loading module data", "module", module.Name, "error", err)
		}
	}

	return module, nil
}

func (d *DataStore) SetModuleData(name types.ModuleName, data any) error {
	d.mu.Lock()
	defer d.mu.Unlock()

	module, ok := d.registry[name]
	if !ok {
		return fmt.Errorf("%s not found in registry", name)
	}

	module.Data = data
	module.Updated = time.Now().Format(time.RFC3339)
	if err := d.saveModuleData(module); err != nil {
		return err
	}

	// Broadcast the module data update event
	if eb := bus.GetInstance(); eb != nil {
		eb.Publish(bus.Event{
			Type: bus.EventDataModuleUpdate,
			Data: module,
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
		updaters = append(updaters, module.Updater)
	}
	return updaters
}

func (d *DataStore) GetAllModuleData() map[types.ModuleName]any {
	data := make(map[types.ModuleName]any)

	for _, module := range d.registry {
		data[module.Updater.Name()] = module.Data
	}

	return data
}

// loadModuleData loads the module data from a JSON file
func (d *DataStore) loadModuleData(m *types.Module) error {
	if m == nil {
		return fmt.Errorf("module is nil")
	}
	dataPath, err := utils.GetDataPath()
	if err != nil {
		return fmt.Errorf("could not get data path: %w", err)
	}

	v := viper.New()
	v.SetConfigName(string(m.Name))
	v.SetConfigType("json")
	v.AddConfigPath(dataPath)

	if err := v.ReadInConfig(); err != nil {
		if _, ok := err.(viper.ConfigFileNotFoundError); ok {
			// Config file not found, use default values
			return nil
		}
		return fmt.Errorf("error reading config file: %w", err)
	}

	if err := v.Unmarshal(m); err != nil {
		return fmt.Errorf("unable to decode into struct: %w", err)
	}

	return nil
}

// saveModuleData saves the module data to a JSON file
func (d *DataStore) saveModuleData(m types.Module) error {
	dataPath, err := utils.GetDataPath()
	if err != nil {
		return fmt.Errorf("could not get data path: %w", err)
	}

	v := viper.New()
	v.SetConfigName(string(m.Name))
	v.SetConfigType("json")
	v.AddConfigPath(dataPath)

	v.Set("module", m.Name)
	v.Set("data", m.Data)
	v.Set("updated", m.Updated)

	if err := v.WriteConfig(); err != nil {
		if _, ok := err.(viper.ConfigFileNotFoundError); ok {
			// Config file not found, create it
			if err := v.SafeWriteConfig(); err != nil {
				return fmt.Errorf("error writing data file: %w", err)
			}
		} else {
			return fmt.Errorf("error writing data file: %w", err)
		}
	}

	return nil
}
