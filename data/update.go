package data

import (
	"context"
	"fmt"
	"sync"
	"time"

	"log/slog"

	"github.com/timmo001/system-bridge/types"
	"golang.org/x/time/rate"
)

// UpdateTaskProcessor handles async task processing with rate limiting
type UpdateTaskProcessor struct {
	// Data store to update
	DataStore *DataStore

	// Rate limiter to control CPU usage
	limiter *rate.Limiter

	// Channel for queuing tasks
	taskQueue chan types.Updater

	// WaitGroup to track running tasks
	wg sync.WaitGroup

	// Context for cancellation
	ctx    context.Context
	cancel context.CancelFunc
}

func NewUpdateTaskProcessor(dataStore *DataStore, tasksPerSecond float64, burstLimit int) (*UpdateTaskProcessor, error) {
	if dataStore == nil {
		return nil, fmt.Errorf("dataStore cannot be nil")
	}

	ctx, cancel := context.WithCancel(context.Background())

	return &UpdateTaskProcessor{
		DataStore: dataStore,
		// Create rate limiter with specified tasks/second and burst limit
		limiter:   rate.NewLimiter(rate.Limit(tasksPerSecond), burstLimit),
		taskQueue: make(chan types.Updater, 20), // Buffer size of 20
		ctx:       ctx,
		cancel:    cancel,
	}, nil
}

// Start begins processing tasks
func (tp *UpdateTaskProcessor) Start(workerCount int) {
	for i := 0; i < workerCount; i++ {
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
func (tp *UpdateTaskProcessor) AddTask(updater types.Updater) {
	select {
	case tp.taskQueue <- updater:
	case <-tp.ctx.Done():
		slog.Info("Task processor is shutting down")
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
				slog.Warn("Rate limiter error", "error", err)
				continue
			}

			ctx, cancel := context.WithTimeout(tp.ctx, 20*time.Second)
			defer cancel()
			// Process task
			data, err := task.Update(ctx)
			if err != nil {
				slog.Warn("Task processing error for module", "module", task.Name(), "error", err)
				continue
			}

			slog.Debug("Updating data for module", "module", task.Name())
			// Update data store
			if err := tp.DataStore.SetModuleData(task.Name(), data); err != nil {
				slog.Error("Failed to set module data for", "module", task.Name(), "error", err)
				continue
			}

		case <-tp.ctx.Done():
			return
		}
	}
}

func RunUpdateTaskProcessor(dataStore *DataStore) {
	// Create processor with 4 tasks/second, burst of 2
	processor, err := NewUpdateTaskProcessor(dataStore, 4, 2)
	if err != nil {
		slog.Error("Failed to create UpdateTaskProcessor", "error", err)
		return
	}

	// Start 3 worker goroutines
	processor.Start(3)

	for _, updater := range dataStore.GetRegisteredModules() {
		processor.AddTask(updater)
	}

	// TODO: use channels and wait groups to track task completion. use context.WithTimeout to make sure to finish withing time frame

	// Run for a while then stop
	time.Sleep(5 * time.Second)
	processor.Stop()
}
