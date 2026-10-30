//go:build darwin

#include <CoreFoundation/CoreFoundation.h>
#include <IOKit/IOMessage.h>
#include <IOKit/pwr_mgt/IOPMLib.h>

#include "_cgo_export.h"

static io_connect_t rootPort = MACH_PORT_NULL;
static IONotificationPortRef notifyPort = NULL;
static io_object_t notifier = 0;
static CFRunLoopRef runLoop = NULL;

static void sleepCallback(void *refCon, io_service_t service, natural_t messageType, void *messageArgument) {
	switch (messageType) {
	case kIOMessageCanSystemSleep:
		// Idle sleep asks first; let it go ahead
		IOAllowPowerChange(rootPort, (long)messageArgument);
		break;
	case kIOMessageSystemWillSleep:
		// macOS waits up to 30 seconds for this to be allowed, so it always is
		goSleepMessage(1);
		IOAllowPowerChange(rootPort, (long)messageArgument);
		break;
	case kIOMessageSystemHasPoweredOn:
		goSleepMessage(2);
		break;
	}
}

int startSleepNotifications(void) {
	rootPort = IORegisterForSystemPower(NULL, &notifyPort, sleepCallback, &notifier);
	if (rootPort == MACH_PORT_NULL) {
		return 0;
	}
	runLoop = CFRunLoopGetCurrent();
	CFRunLoopAddSource(runLoop, IONotificationPortGetRunLoopSource(notifyPort), kCFRunLoopCommonModes);
	return 1;
}

void runSleepNotifications(double seconds) {
	CFRunLoopRunInMode(kCFRunLoopDefaultMode, seconds, false);
}

void cleanupSleepNotifications(void) {
	CFRunLoopRemoveSource(runLoop, IONotificationPortGetRunLoopSource(notifyPort), kCFRunLoopCommonModes);
	IODeregisterForSystemPower(&notifier);
	IOServiceClose(rootPort);
	IONotificationPortDestroy(notifyPort);
	rootPort = MACH_PORT_NULL;
	notifyPort = NULL;
	notifier = 0;
	runLoop = NULL;
}
