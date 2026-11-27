package push

import (
	"math"
	"sync"
	"time"

	"github.com/timmo001/system-bridge/types"
)

const (
	// activityEvery is the least time between two pushes for the same work,
	// so a provider reporting on every read doesn't flood the phones
	activityEvery = 15 * time.Second
	// activityStep is how far, in percent, progress moves before it's
	// pushed again
	activityStep = 5
)

// shownActivity is what the phones were last told about a piece of work
type shownActivity struct {
	label   string
	status  string
	percent int
	// started is when the work started, in Unix milliseconds, kept so every
	// push for it gives the same time
	started int64
	sent    time.Time
}

// Activity follows the services providers' busy items, such as a backup,
// and says what to push so the phones show each as ongoing work until it's
// done
type Activity struct {
	mu    sync.Mutex
	shown map[string]shownActivity
	now   func() time.Time
}

func NewActivity() *Activity {
	return &Activity{shown: map[string]shownActivity{}, now: time.Now}
}

// Update takes the services data as it's read and returns the pushes it
// calls for, in order: one for work that started, has a new status or has
// moved on, and a done one for work that stopped
func (a *Activity) Update(data types.ServicesData) []Payload {
	a.mu.Lock()
	defer a.mu.Unlock()

	now := a.now()
	var payloads []Payload
	busy := make(map[string]bool, len(data.Items))

	// When each busy item started, as its provider says
	since := make(map[string]int64, len(data.Busy))
	for _, entry := range data.Busy {
		if entry.Since != nil {
			since["service:"+entry.Provider+":"+entry.Item] = *entry.Since
		}
	}

	for _, item := range data.Items {
		id := "service:" + item.Provider + ":" + item.ID
		if !item.Busy {
			if last, ok := a.shown[id]; ok {
				payloads = append(payloads, finished(id, last.label, item.Health))
				delete(a.shown, id)
			}
			continue
		}
		busy[id] = true

		status := "Running"
		if item.Summary != nil && *item.Summary != "" {
			status = *item.Summary
		}
		percent := -1
		if item.Progress != nil {
			percent = int(math.Round(*item.Progress * 100))
		}

		last, ok := a.shown[id]
		started := last.started
		if ok {
			moved := status != last.status || percent-last.percent >= activityStep || last.percent-percent >= activityStep
			if !moved || now.Sub(last.sent) < activityEvery {
				continue
			}
		} else {
			// The provider's start time, or when it was first seen busy. Not
			// the item's last run, which for a service is when it started.
			started = since[id]
			if started <= 0 {
				started = now.UnixMilli()
			}
		}

		ongoing := &Ongoing{ID: id, Status: status, Started: started}
		if percent >= 0 {
			ongoing.Progress = &Progress{Value: float64(percent), Max: 100}
		}
		payloads = append(payloads, Payload{
			Title:   item.Label,
			Link:    "/services",
			Level:   "passive",
			Ongoing: ongoing,
		})
		a.shown[id] = shownActivity{label: item.Label, status: status, percent: percent, started: started, sent: now}
	}

	// Work whose item went from the list, such as its provider being taken
	// out of the settings, is done too
	for id, last := range a.shown {
		if !busy[id] {
			payloads = append(payloads, finished(id, last.label, ""))
			delete(a.shown, id)
		}
	}

	return payloads
}

// finished is the push that ends a piece of work, saying how it went
func finished(id, label string, health types.ServiceHealth) Payload {
	status := "Finished"
	if health == types.ServiceHealthFailed {
		status = "Failed"
	}
	return Payload{
		Title:   label,
		Link:    "/services",
		Level:   "passive",
		Ongoing: &Ongoing{ID: id, Status: status, Done: true},
	}
}
