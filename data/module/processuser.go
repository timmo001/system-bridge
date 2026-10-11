package data_module

import (
	"os/user"
	"strconv"
	"sync"
	"time"

	"github.com/shirou/gopsutil/v4/process"
)

// usernameCacheTTL is how long a user ID to name mapping is kept. Account
// names change rarely, while looking one up can mean parsing the password
// database, which was happening once per process for every scan.
const usernameCacheTTL = 10 * time.Minute

type cachedUsername struct {
	name string
	err  error
	at   time.Time
}

var usernameCache = struct {
	sync.Mutex
	byUID map[uint32]cachedUsername
}{byUID: make(map[uint32]cachedUsername)}

// processUsername returns the name of the user owning p. On Unix it resolves
// the real user ID through a shared cache; elsewhere it falls back to the
// library's own lookup.
func processUsername(p *process.Process) (string, error) {
	uids, err := p.Uids()
	if err != nil || len(uids) == 0 {
		return p.Username()
	}
	return lookupUsername(uids[0])
}

func lookupUsername(uid uint32) (string, error) {
	usernameCache.Lock()
	defer usernameCache.Unlock()

	if entry, ok := usernameCache.byUID[uid]; ok && time.Since(entry.at) < usernameCacheTTL {
		return entry.name, entry.err
	}

	entry := cachedUsername{at: time.Now()}
	if u, err := user.LookupId(strconv.FormatUint(uint64(uid), 10)); err != nil {
		entry.err = err
	} else {
		entry.name = u.Username
	}
	usernameCache.byUID[uid] = entry
	return entry.name, entry.err
}
