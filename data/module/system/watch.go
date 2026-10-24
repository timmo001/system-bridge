package system

import "time"

// awayAfter is how long without input before the user counts as away. Going
// away and coming back update the system module straight away; the idle time
// in between moves on with each refresh.
const awayAfter = time.Minute
