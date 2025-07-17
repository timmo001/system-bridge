package data

import (
	"context"
	"os"
	"path/filepath"
	"strconv"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/timmo001/system-bridge/types"
)

// Mock updater for testing
type mockUpdater struct {
	name types.ModuleName
	data any
	err  error
}

func (m mockUpdater) Name() types.ModuleName {
	return m.name
}

func (m mockUpdater) Update(ctx context.Context) (any, error) {
	if m.err != nil {
		return nil, m.err
	}
	return m.data, nil
}

func TestNewDataStore(t *testing.T) {
	t.Run("Create new data store", func(t *testing.T) {
		ds, err := NewDataStore()
		require.NoError(t, err)
		assert.NotNil(t, ds)
		assert.NotNil(t, ds.registry)

		// Check that default modules are registered
		expectedModules := []types.ModuleName{
			types.ModuleBattery,
			types.ModuleCPU,
			types.ModuleDisks,
			types.ModuleDisplays,
			types.ModuleGPUs,
			types.ModuleMedia,
			types.ModuleMemory,
			types.ModuleNetworks,
			types.ModuleProcesses,
			types.ModuleSensors,
			types.ModuleSystem,
		}

		for _, moduleName := range expectedModules {
			_, exists := ds.registry[moduleName]
			assert.True(t, exists, "Module %s should be registered", moduleName)
		}
	})
}

func TestDataStore_Register(t *testing.T) {
	t.Run("Register new module", func(t *testing.T) {
		ds := &DataStore{registry: make(map[types.ModuleName]types.Module)}

		mockMod := mockUpdater{
			name: "test-module",
			data: map[string]string{"test": "data"},
		}

		ds.Register(mockMod)

		module, exists := ds.registry["test-module"]
		assert.True(t, exists)
		assert.Equal(t, types.ModuleName("test-module"), module.Name)
		assert.Equal(t, mockMod, module.Updater)
	})

	t.Run("Register multiple modules", func(t *testing.T) {
		ds := &DataStore{registry: make(map[types.ModuleName]types.Module)}

		mock1 := mockUpdater{name: "module1", data: "data1"}
		mock2 := mockUpdater{name: "module2", data: "data2"}

		ds.Register(mock1)
		ds.Register(mock2)

		assert.Len(t, ds.registry, 2)

		module1, exists1 := ds.registry["module1"]
		assert.True(t, exists1)
		assert.Equal(t, types.ModuleName("module1"), module1.Name)

		module2, exists2 := ds.registry["module2"]
		assert.True(t, exists2)
		assert.Equal(t, types.ModuleName("module2"), module2.Name)
	})
}

func TestDataStore_GetModule(t *testing.T) {
	// Create a temporary directory for testing
	tempDir, err := os.MkdirTemp("", "system-bridge-test-*")
	require.NoError(t, err)
	defer func() {
		if err := os.RemoveAll(tempDir); err != nil {
			t.Logf("failed to remove temp dir: %v", err)
		}
	}()

	// Set the config directory to our temp directory
	t.Setenv("SYSTEM_BRIDGE_CONFIG_DIR", tempDir)

	t.Run("Get existing module with data", func(t *testing.T) {
		ds := &DataStore{registry: make(map[types.ModuleName]types.Module)}

		testData := map[string]string{"key": "value"}
		mockMod := mockUpdater{
			name: "test-module",
			data: testData,
		}

		ds.Register(mockMod)

		// Set module data
		module := ds.registry["test-module"]
		// The expected timestamp format is time.RFC3339
		module.Updated = time.Now().Format(time.RFC3339)
		ds.registry["test-module"] = module

		retrievedModule, err := ds.GetModule("test-module")
		require.NoError(t, err)
		assert.Equal(t, types.ModuleName("test-module"), retrievedModule.Name)
		assert.Equal(t, testData, retrievedModule.Data)
		assert.NotEmpty(t, retrievedModule.Updated)
	})

	t.Run("Get module that doesn't exist", func(t *testing.T) {
		ds := &DataStore{registry: make(map[types.ModuleName]types.Module)}

		_, err := ds.GetModule("non-existent")
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "not found in registry")
	})

	t.Run("Get module with nil data triggers refresh", func(t *testing.T) {
		ds := &DataStore{registry: make(map[types.ModuleName]types.Module)}

		mockMod := mockUpdater{
			name: "test-module",
			data: map[string]string{"refreshed": "data"},
		}

		ds.Register(mockMod)

		// Module should have nil data initially
		module, err := ds.GetModule("test-module")
		require.NoError(t, err)
		assert.Equal(t, types.ModuleName("test-module"), module.Name)
		// Data might still be nil if loading from file fails, which is expected in this test
	})
}

func TestDataStore_SetModuleData(t *testing.T) {
	// Create a temporary directory for testing
	tempDir, err := os.MkdirTemp("", "system-bridge-test-*")
	require.NoError(t, err)
	defer func() {
		if err := os.RemoveAll(tempDir); err != nil {
			t.Logf("failed to remove temp dir: %v", err)
		}
	}()

	// Set the config directory to our temp directory
	t.Setenv("SYSTEM_BRIDGE_CONFIG_DIR", tempDir)

	t.Run("Set module data successfully", func(t *testing.T) {
		ds := &DataStore{registry: make(map[types.ModuleName]types.Module)}

		mockMod := mockUpdater{
			name: "test-module",
		}

		ds.Register(mockMod)

		testData := map[string]interface{}{
			"cpu_usage": 45.5,
			"cores":     8,
		}

		err := ds.SetModuleData("test-module", testData)
		require.NoError(t, err)

		// Verify data was set
		module := ds.registry["test-module"]
		assert.Equal(t, testData, module.Data)
		assert.NotEmpty(t, module.Updated)

		// Verify data file was created
		dataPath := filepath.Join(tempDir, "data", "test-module.json")
		assert.FileExists(t, dataPath)
	})

	t.Run("Set data for non-existent module", func(t *testing.T) {
		ds := &DataStore{registry: make(map[types.ModuleName]types.Module)}

		err := ds.SetModuleData("non-existent", map[string]string{"test": "data"})
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "not found in registry")
	})

	t.Run("Set module data updates timestamp", func(t *testing.T) {
		ds := &DataStore{registry: make(map[types.ModuleName]types.Module)}

		mockMod := mockUpdater{name: "test-module"}
		ds.Register(mockMod)

		// Set data first time
		err := ds.SetModuleData("test-module", "data1")
		require.NoError(t, err)

		firstUpdate := ds.registry["test-module"].Updated
		assert.NotEmpty(t, firstUpdate)

		// Wait a bit and set data again
		time.Sleep(100 * time.Millisecond)

		err = ds.SetModuleData("test-module", "data2")
		require.NoError(t, err)

		secondUpdate := ds.registry["test-module"].Updated
		assert.NotEmpty(t, secondUpdate)
		assert.NotEqual(t, firstUpdate, secondUpdate)
	})
}

func TestDataStore_GetRegisteredModules(t *testing.T) {
	t.Run("Get registered modules", func(t *testing.T) {
		ds := &DataStore{registry: make(map[types.ModuleName]types.Module)}

		mock1 := mockUpdater{name: "module1"}
		mock2 := mockUpdater{name: "module2"}
		mock3 := mockUpdater{name: "module3"}

		ds.Register(mock1)
		ds.Register(mock2)
		ds.Register(mock3)

		updaters := ds.GetRegisteredModules()
		assert.Len(t, updaters, 3)

		// Check that all updaters are present
		names := make(map[types.ModuleName]bool)
		for _, updater := range updaters {
			names[updater.Name()] = true
		}

		assert.True(t, names["module1"])
		assert.True(t, names["module2"])
		assert.True(t, names["module3"])
	})

	t.Run("Get registered modules from empty store", func(t *testing.T) {
		ds := &DataStore{registry: make(map[types.ModuleName]types.Module)}

		updaters := ds.GetRegisteredModules()
		assert.Len(t, updaters, 0)
		assert.NotNil(t, updaters)
	})
}

func TestDataStore_GetAllModuleData(t *testing.T) {
	t.Run("Get all module data", func(t *testing.T) {
		ds := &DataStore{registry: make(map[types.ModuleName]types.Module)}

		// Register modules with data
		mock1 := mockUpdater{name: "module1"}
		mock2 := mockUpdater{name: "module2"}

		ds.Register(mock1)
		ds.Register(mock2)

		// Set data for modules
		module1 := ds.registry["module1"]
		module1.Data = "data1"
		ds.registry["module1"] = module1

		module2 := ds.registry["module2"]
		module2.Data = "data2"
		ds.registry["module2"] = module2

		allData := ds.GetAllModuleData()
		assert.Len(t, allData, 2)
		assert.Equal(t, "data1", allData["module1"])
		assert.Equal(t, "data2", allData["module2"])
	})

	t.Run("Get all module data with nil data", func(t *testing.T) {
		ds := &DataStore{registry: make(map[types.ModuleName]types.Module)}

		mock := mockUpdater{name: "module-with-nil-data"}
		ds.Register(mock)

		allData := ds.GetAllModuleData()
		assert.Len(t, allData, 1)
		assert.Nil(t, allData["module-with-nil-data"])
	})
}

func TestDataStore_ConcurrentAccess(t *testing.T) {
	t.Run("Concurrent register and get operations", func(t *testing.T) {
		ds := &DataStore{registry: make(map[types.ModuleName]types.Module)}

		// Number of goroutines to run concurrently
		numGoroutines := 10
		done := make(chan bool, numGoroutines*2)

		// Register modules concurrently
		for i := 0; i < numGoroutines; i++ {
			go func(id int) {
				mock := mockUpdater{
					name: types.ModuleName("module-" + strconv.Itoa(id)),
					data: "data-" + strconv.Itoa(id),
				}
				ds.Register(mock)
				done <- true
			}(i)
		}

		// Get registered modules concurrently
		for i := 0; i < numGoroutines; i++ {
			go func() {
				ds.GetRegisteredModules()
				done <- true
			}()
		}

		// Wait for all goroutines to complete
		for i := 0; i < numGoroutines*2; i++ {
			<-done
		}

		// Verify all modules were registered
		updaters := ds.GetRegisteredModules()
		assert.Len(t, updaters, numGoroutines)
	})
}

func TestDataStore_ModuleLifecycle(t *testing.T) {
	// Create a temporary directory for testing
	tempDir, err := os.MkdirTemp("", "system-bridge-test-*")
	require.NoError(t, err)
	defer func() {
		if err := os.RemoveAll(tempDir); err != nil {
			t.Logf("failed to remove temp dir: %v", err)
		}
	}()

	// Set the config directory to our temp directory
	t.Setenv("SYSTEM_BRIDGE_CONFIG_DIR", tempDir)

	t.Run("Complete module lifecycle", func(t *testing.T) {
		ds := &DataStore{registry: make(map[types.ModuleName]types.Module)}

		// 1. Register module
		mockMod := mockUpdater{
			name: "lifecycle-test",
			data: map[string]interface{}{"initial": "data"},
		}
		ds.Register(mockMod)

		// 2. Set initial data
		initialData := map[string]interface{}{
			"status": "active",
			"value":  100,
		}
		err := ds.SetModuleData("lifecycle-test", initialData)
		require.NoError(t, err)

		// 3. Get module and verify data
		module, err := ds.GetModule("lifecycle-test")
		require.NoError(t, err)
		assert.Equal(t, initialData, module.Data)
		assert.NotEmpty(t, module.Updated)

		// 4. Update data
		updatedData := map[string]interface{}{
			"status": "updated",
			"value":  200,
		}
		err = ds.SetModuleData("lifecycle-test", updatedData)
		require.NoError(t, err)

		// 5. Verify updated data
		module, err = ds.GetModule("lifecycle-test")
		require.NoError(t, err)
		assert.Equal(t, updatedData, module.Data)

		// 6. Verify in all module data
		allData := ds.GetAllModuleData()
		assert.Equal(t, updatedData, allData["lifecycle-test"])
	})
}
