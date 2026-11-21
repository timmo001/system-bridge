package types

// ServiceHealth is how an item is doing. The values run worst to best, as
// the providers report them.
type ServiceHealth string

const (
	ServiceHealthFailed   ServiceHealth = "failed"
	ServiceHealthMissing  ServiceHealth = "missing"
	ServiceHealthInactive ServiceHealth = "inactive"
	ServiceHealthStale    ServiceHealth = "stale"
	ServiceHealthDegraded ServiceHealth = "degraded"
	ServiceHealthWarning  ServiceHealth = "warning"
	ServiceHealthRunning  ServiceHealth = "running"
	ServiceHealthPaused   ServiceHealth = "paused"
	ServiceHealthOK       ServiceHealth = "ok"
)

// ServiceStatKind hints at what a stat's value is, so a client can format it
type ServiceStatKind string

const (
	ServiceStatKindDuration  ServiceStatKind = "duration"
	ServiceStatKindSize      ServiceStatKind = "size"
	ServiceStatKindTimestamp ServiceStatKind = "timestamp"
	ServiceStatKindCount     ServiceStatKind = "count"
)

// ServicesData is what the configured providers report: services, timers,
// checks and what's busy, with each provider's own state
type ServicesData struct {
	Providers []ServiceProvider `json:"providers"`
	Items     []ServiceItem     `json:"items"`
	Busy      []ServiceBusy     `json:"busy"`
	Errors    []ServiceError    `json:"errors"`
}

// ServiceProvider is a provider's last read. A provider that failed keeps
// its earlier items, marked stale, so it never looks like it has nothing busy.
type ServiceProvider struct {
	ID string `json:"id"`
	// Updated is when its last good read finished, in Unix milliseconds
	Updated *int64 `json:"updated"`
	// Error is why its last read failed, or null when it worked
	Error *string `json:"error"`
}

// ServiceItem is one service, timer or check from a provider. Times are in
// Unix milliseconds.
type ServiceItem struct {
	Provider string `json:"provider"`
	ID       string `json:"id"`
	Label    string `json:"label"`
	// Kind is service, timer or check, or another kind a provider has
	Kind        string        `json:"kind"`
	Health      ServiceHealth `json:"health"`
	Summary     *string       `json:"summary"`
	Busy        bool          `json:"busy"`
	LastRun     *int64        `json:"last_run"`
	LastSuccess *int64        `json:"last_success"`
	NextRun     *int64        `json:"next_run"`
	// Progress runs from 0 to 1
	Progress *float64        `json:"progress"`
	Stats    []ServiceStat   `json:"stats"`
	Notes    []string        `json:"notes"`
	Lists    []ServiceList   `json:"lists"`
	Actions  []ServiceAction `json:"actions"`
}

// ServiceStat is a figure an item reports. Value is a number or a short
// string.
type ServiceStat struct {
	ID    string           `json:"id"`
	Label string           `json:"label"`
	Value any              `json:"value"`
	Unit  *string          `json:"unit"`
	Kind  *ServiceStatKind `json:"kind"`
}

// ServiceList is a labelled list of label and value pairs, such as a
// backup's sources and when each was last copied
type ServiceList struct {
	ID    string            `json:"id"`
	Label string            `json:"label"`
	Items []ServiceListItem `json:"items"`
}

// ServiceListItem is one row of a ServiceList
type ServiceListItem struct {
	Label string `json:"label"`
	Value string `json:"value"`
}

// ServiceAction is something a client can ask the provider to do with an
// item. Confirm is a question to ask first; Disabled is why it can't run now.
type ServiceAction struct {
	ID       string  `json:"id"`
	Label    string  `json:"label"`
	Confirm  *string `json:"confirm"`
	Disabled *string `json:"disabled"`
}

// ServiceBusy is an item that's busy, and since when in Unix milliseconds
type ServiceBusy struct {
	Provider string `json:"provider"`
	Item     string `json:"item"`
	Label    string `json:"label"`
	Since    *int64 `json:"since"`
}

// ServiceActionResult is how an action went, sent to every client as
// SERVICE_ACTION_COMPLETED. Summary is the first line it printed, or why it
// failed; Output is what it printed, cut off at 64 KiB.
type ServiceActionResult struct {
	Provider string `json:"provider"`
	Item     string `json:"item"`
	Action   string `json:"action"`
	OK       bool   `json:"ok"`
	Summary  string `json:"summary"`
	Output   string `json:"output"`
}

// ServiceError is a problem a provider reported, such as a registration it
// couldn't read, or an item System Bridge couldn't use
type ServiceError struct {
	Provider string `json:"provider"`
	Source   string `json:"source"`
	Message  string `json:"message"`
}
