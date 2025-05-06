package data

import (
	"context"
	"fmt"
	"sync"
	"time"

	"github.com/charmbracelet/log"
	"github.com/timmo001/system-bridge/bus"
	"github.com/timmo001/system-bridge/data/module"
	"github.com/timmo001/system-bridge/types"
)

type Updater interface {
	Name() types.ModuleName
	Update(context.Context) (any, error)
}

// ModuleMeta represents a data module
type ModuleMeta struct {
	Module  types.ModuleName `json:"module" mapstructure:"module"`
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

	ds.Register(data_module.BatteryData{})
	ds.Register(data_module.CPUData{})
	ds.Register(data_module.DisksData{})
	ds.Register(data_module.DisplaysData{})
	ds.Register(data_module.GPUData{})
	ds.Register(data_module.MediaData{})
	ds.Register(data_module.MemoryData{})
	ds.Register(data_module.NetworksData{})
	ds.Register(data_module.ProcessesData{})
	ds.Register(data_module.SensorsData{})
	ds.Register(data_module.SystemData{})

	return ds, nil
}

func (d *DataStore) Register(u Updater) {
	d.mu.Lock()
	defer d.mu.Unlock()
	log.Info("Registering data module", "module", u.Name())

	d.registry[u.Name()] = ModuleMeta{updater: u, Module: u.Name()}
}

func (d *DataStore) GetModule(name types.ModuleName) (ModuleMeta, error) {

	meta, ok := d.registry[name]
	if !ok {
		return ModuleMeta{}, fmt.Errorf("%s not found in registry", name)
	}

	// If the module data is nil, refresh the data
	if meta.Data == nil {
		log.Info("Module data is nil, refreshing data", "module", name)
		data, err := meta.updater.Update(context.Background())
		if err != nil {
			log.Error("Error loading module data", "module", name, "error", err)
		}

		meta.Data = data
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
