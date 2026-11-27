package push

import (
	"testing"
	"time"

	"github.com/timmo001/system-bridge/types"
)

// backupStarted is when the backup started, as the provider's busy list says
const backupStarted int64 = 1795812612056

func backup(busy bool, summary string, progress float64, health types.ServiceHealth) types.ServicesData {
	data := types.ServicesData{Items: []types.ServiceItem{{
		Provider: "dot", ID: "kopia", Label: "Backup", Health: health,
		Busy: busy, Summary: &summary, Progress: &progress,
	}}}
	if busy {
		started := backupStarted
		data.Busy = []types.ServiceBusy{{Provider: "dot", Item: "kopia", Label: "Backup", Since: &started}}
	}
	return data
}

func TestActivityThrottlesAndEnds(t *testing.T) {
	now := time.Unix(0, 0)
	activity := NewActivity()
	activity.now = func() time.Time { return now }

	step := func(data types.ServicesData, after time.Duration) []Payload {
		now = now.Add(after)
		return activity.Update(data)
	}

	if got := step(backup(true, "Uploading", 0.10, types.ServiceHealthRunning), 0); len(got) != 1 || got[0].Ongoing.Progress.Value != 10 {
		t.Fatalf("start: got %+v, want one push at 10%%", got)
	}
	if got := step(backup(true, "Uploading", 0.30, types.ServiceHealthRunning), time.Second); len(got) != 0 {
		t.Errorf("a big move a second later: got %d pushes, want none until 15 s pass", len(got))
	}
	if got := step(backup(true, "Uploading", 0.30, types.ServiceHealthRunning), activityEvery); len(got) != 1 || got[0].Ongoing.Started != backupStarted {
		t.Errorf("a big move after 15 s: got %+v, want one push still started when the provider said", got)
	}
	if got := step(backup(true, "Uploading", 0.32, types.ServiceHealthRunning), time.Minute); len(got) != 0 {
		t.Errorf("a 2 point move: got %d pushes, want none", len(got))
	}

	got := step(backup(false, "", 0, types.ServiceHealthFailed), time.Second)
	if len(got) != 1 || !got[0].Ongoing.Done || got[0].Ongoing.Status != "Failed" {
		t.Fatalf("end: got %+v, want one done push saying Failed", got)
	}
	if got := step(backup(false, "", 0, types.ServiceHealthOK), time.Minute); len(got) != 0 {
		t.Errorf("after the end: got %d pushes, want none", len(got))
	}
}

func TestOfferNewKindsOnce(t *testing.T) {
	store := &Store{state: state{Subscriptions: []Subscription{
		{Client: Client{ID: "phone"}, Kinds: []Kind{KindNotifications}},
	}}}

	if !store.offerNewKinds() {
		t.Fatal("want the first offer to change the subscriptions")
	}
	kinds := store.state.Subscriptions[0].Kinds
	if len(kinds) != 2 || kinds[1] != KindActivity {
		t.Errorf("got %v, want notifications and activity, without updates turned back on", kinds)
	}

	store.state.Subscriptions[0].Kinds = []Kind{}
	if store.offerNewKinds() || len(store.state.Subscriptions[0].Kinds) != 0 {
		t.Error("want a kind turned off to stay off")
	}
}
