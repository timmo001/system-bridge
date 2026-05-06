package service

import (
	"fmt"

	"github.com/timmo001/system-bridge/data"
	"github.com/timmo001/system-bridge/types"
	"github.com/timmo001/system-bridge/utils/handlers/media"
)

type Service struct {
	dataStore              *data.DataStore
	registerDataListener   func(string, []types.ModuleName)
	unregisterDataListener func(string)
}

func New(
	dataStore *data.DataStore,
	registerDataListener func(string, []types.ModuleName),
	unregisterDataListener func(string),
) *Service {
	return &Service{
		dataStore:              dataStore,
		registerDataListener:   registerDataListener,
		unregisterDataListener: unregisterDataListener,
	}
}

func (s *Service) GetModule(name types.ModuleName) (types.Module, error) {
	if s == nil || s.dataStore == nil {
		return types.Module{}, fmt.Errorf("data service unavailable")
	}

	return s.dataStore.GetModule(name)
}

func (s *Service) GetModules(names []types.ModuleName) (map[string]any, error) {
	if s == nil || s.dataStore == nil {
		return nil, fmt.Errorf("data service unavailable")
	}

	result := make(map[string]any, len(names))
	for _, name := range names {
		module, err := s.dataStore.GetModule(name)
		if err != nil {
			continue
		}
		result[string(name)] = module.Data
	}

	return result, nil
}

func (s *Service) RegisterDataListener(connection string, modules []types.ModuleName) error {
	if s == nil || s.registerDataListener == nil {
		return fmt.Errorf("data listener service unavailable")
	}

	s.registerDataListener(connection, modules)
	return nil
}

func (s *Service) UnregisterDataListener(connection string) error {
	if s == nil || s.unregisterDataListener == nil {
		return fmt.Errorf("data listener service unavailable")
	}

	s.unregisterDataListener(connection)
	return nil
}

func (s *Service) MediaControl(action string) error {
	if action == "" {
		return fmt.Errorf("no action provided for media control")
	}

	if err := media.Control(media.MediaAction(action)); err != nil {
		return err
	}

	if s == nil || s.dataStore == nil {
		return nil
	}

	if err := s.dataStore.TriggerModuleUpdate(types.ModuleMedia); err != nil {
		return fmt.Errorf("failed to trigger media module update: %w", err)
	}

	return nil
}
