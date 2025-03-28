package power

// Shutdown shuts down the system
func Shutdown() error {
	return shutdown()
}

// Restart restarts the system
func Restart() error {
	return restart()
}

// Sleep puts the system to sleep
func Sleep() error {
	return sleep()
}

// Hibernate hibernates the system
func Hibernate() error {
	return hibernate()
}

// Lock locks the system
func Lock() error {
	return lock()
}

// Logout logs out the current user
func Logout() error {
	return logout()
}
