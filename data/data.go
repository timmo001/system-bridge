package data

import (
	"context"
	"fmt"
	"sync"
	"time"

	"github.com/charmbracelet/log"
	"github.com/spf13/viper"
	"github.com/timmo001/system-bridge/bus"
	"github.com/timmo001/system-bridge/data/module"
	"github.com/timmo001/system-bridge/types"
	"github.com/timmo001/system-bridge/utils"
)

type Updater interface {
	Name() types.ModuleName
	Update(context.Context) (any, error)
}

// ModuleMeta represents a data module
type ModuleMeta struct {
	Name    types.ModuleName `json:"module" mapstructure:"module"`
	updater Updater
	Data    any    `json:"data" mapstructure:"data"`
	Updated string `json:"updated" mapstructure:"updated"`
}

type DataStore struct {
	mu       sync.RWMutex
	registry map[types.ModuleName]ModuleMeta
}

func NewDataStore() (*DataStore, error) {
	ds := &DataStore{registry: make(map[types.ModuleName]ModuleMeta, 0)}

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

func (d *DataStore) Register(u Updater) {
	d.mu.Lock()
	defer d.mu.Unlock()
	log.Info("Registering data module", "module", u.Name())

	d.registry[u.Name()] = ModuleMeta{updater: u, Name: u.Name()}
}

func (d *DataStore) GetModule(name types.ModuleName) (ModuleMeta, error) {

	meta, ok := d.registry[name]
	if !ok {
		return ModuleMeta{}, fmt.Errorf("%s not found in registry", name)
	}

	// If the module data is nil, refresh the data
	if meta.Data == nil {
		log.Info("Module data is nil, refreshing data", "module", meta.Name)
		if err := d.loadModuleData(&meta); err != nil {
			log.Error("Error loading module data", "module", meta.Name, "error", err)
		}
	}

	return meta, nil
}

func (d *DataStore) SetModuleData(name types.ModuleName, data any) error {
	d.mu.Lock()
	defer d.mu.Unlock()

	meta, ok := d.registry[name]
	if !ok {
		return fmt.Errorf("%s not found in registry", name)
	}

	meta.Data = data
	meta.Updated = time.Now().Format(time.RFC3339)
	if err := d.saveModuleData(meta); err != nil {
		return err
	}

	// Broadcast the module data update event
	if eb := bus.GetInstance(); eb != nil {
		eb.Publish(bus.Event{
			Type: bus.EventDataModuleUpdate,
			Data: meta,
		})
	}

	d.registry[name] = meta

	return nil
}

func (d *DataStore) GetRegisteredModules() []Updater {
	d.mu.Lock()
	defer d.mu.Unlock()

	updaters := make([]Updater, 0)
	for _, meta := range d.registry {
		updaters = append(updaters, meta.updater)
	}
	return updaters
}
func (d *DataStore) GetAllModuleData() map[types.ModuleName]any {
	data := make(map[types.ModuleName]any)

	for _, meta := range d.registry {
		data[meta.updater.Name()] = meta.Data
	}

	return data
}

// loadModuleData loads the module data from a JSON file
func (d *DataStore) loadModuleData(m *ModuleMeta) error {
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
func (d *DataStore) saveModuleData(m ModuleMeta) error {
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
