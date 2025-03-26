package data

import (
	"context"
	"sync"
	"time"

	"github.com/charmbracelet/log"
	data_module "github.com/timmo001/system-bridge/backend/data/module"
	"golang.org/x/time/rate"
)

// UpdateTaskProcessor handles async task processing with rate limiting
type UpdateTaskProcessor struct {
	// Data store to update
	DataStore *DataStore

	// Rate limiter to control CPU usage
	limiter *rate.Limiter

	// Channel for queuing tasks
	taskQueue chan data_module.Module

	// WaitGroup to track running tasks
	wg sync.WaitGroup

	// Context for cancellation
	ctx    context.Context
	cancel context.CancelFunc
}

func NewUpdateTaskProcessor(dataStore *DataStore, tasksPerSecond float64, burstLimit int) *UpdateTaskProcessor {
	if dataStore == nil {
		log.Fatal("dataStore cannot be nil")
	}

	ctx, cancel := context.WithCancel(context.Background())

	return &UpdateTaskProcessor{
		DataStore: dataStore,
		// Create rate limiter with specified tasks/second and burst limit
		limiter:   rate.NewLimiter(rate.Limit(tasksPerSecond), burstLimit),
		taskQueue: make(chan data_module.Module, 20), // Buffer size of 20
		ctx:       ctx,
		cancel:    cancel,
	}
}

// Start begins processing tasks
func (tp *UpdateTaskProcessor) Start(workerCount int) {
	for range workerCount {
		tp.wg.Add(1)
		go tp.worker()
	}
}

// Stop gracefully shuts down the processor
func (tp *UpdateTaskProcessor) Stop() {
	tp.cancel()
	close(tp.taskQueue)
	tp.wg.Wait()
}

// AddTask queues a new task
func (tp *UpdateTaskProcessor) AddTask(task data_module.Module) {
	select {
	case tp.taskQueue <- task:
	case <-tp.ctx.Done():
		log.Info("Task processor is shutting down")
	}
}

// worker processes tasks from the queue
func (tp *UpdateTaskProcessor) worker() {
	defer tp.wg.Done()

	for {
		select {
		case task, ok := <-tp.taskQueue:
			if !ok {
				return // Channel closed
			}

			// Wait for rate limiter
			err := tp.limiter.Wait(tp.ctx)
			if err != nil {
				log.Warnf("Rate limiter error: %v", err)
				continue
			}

			// Process task
			d, err := task.UpdateModule()
			if err != nil {
				log.Warnf("Task processing error for module %s: %v", task.Module, err)
				continue
			}

			log.Debugf("Updating data for module: %s", task.Module)
			// Update data store
			if err := tp.DataStore.SetModuleData(task.Module, d); err != nil {
				log.Errorf("Failed to set module data for %s: %v", task.Module, err)
				continue
			}

		case <-tp.ctx.Done():
			return
		}
	}
}

func RunUpdateTaskProcessor(dataStore *DataStore) {
	// Create processor with 4 tasks/second, burst of 2
	processor := NewUpdateTaskProcessor(dataStore, 4, 2)

	// Start 3 worker goroutines
	processor.Start(3)

	for _, task := range []data_module.Module{
		{Module: data_module.ModuleBattery},
		{Module: data_module.ModuleCPU},
		{Module: data_module.ModuleDisks},
		{Module: data_module.ModuleDisplays},
		{Module: data_module.ModuleGPUs},
		{Module: data_module.ModuleMedia},
		{Module: data_module.ModuleMemory},
		{Module: data_module.ModuleNetworks},
		{Module: data_module.ModuleProcesses},
		{Module: data_module.ModuleSensors},
		{Module: data_module.ModuleSystem},
	} {
		processor.AddTask(task)
	}

	// Run for a while then stop
	time.Sleep(5 * time.Second)
	processor.Stop()
}
