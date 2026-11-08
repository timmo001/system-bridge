package event_handler

import (
	"sync"

	"github.com/timmo001/system-bridge/types"
)

var (
	beforePower   func(types.PowerState)
	beforePowerMu sync.RWMutex
)

// OnBeforePower sets what runs before System Bridge itself puts the system
// to sleep or shuts it down, while the network is still up, such as pushing
// to phones. The system's own warning comes too late for that: the network
// can go down as soon as it's sent.
func OnBeforePower(handler func(types.PowerState)) {
	beforePowerMu.Lock()
	beforePower = handler
	beforePowerMu.Unlock()
}

// noticeBeforePower runs the OnBeforePower handler, if there is one
func noticeBeforePower(state types.PowerState) {
	beforePowerMu.RLock()
	handler := beforePower
	beforePowerMu.RUnlock()
	if handler != nil {
		handler(state)
	}
}
