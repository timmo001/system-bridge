//go:build windows

package cpu

import (
	"runtime"
	"time"
	"unsafe"

	"golang.org/x/sys/windows"
)

// Performance counters are read in process through the PDH API rather than
// by running typeperf, which started a new process on every update.
const (
	// pdhSampleWindow is the interval between the two samples a rate
	// counter needs, matching typeperf's default.
	pdhSampleWindow = time.Second

	pdhFmtDouble   = 0x00000200
	pdhFmtNoCap100 = 0x00008000
	pdhMoreData    = 0x800007d2

	pdhCStatusValidData = 0x0
	pdhCStatusNewData   = 0x1
)

var (
	modPdh                          = windows.NewLazySystemDLL("pdh.dll")
	procPdhOpenQuery                = modPdh.NewProc("PdhOpenQuery")
	procPdhAddEnglishCounter        = modPdh.NewProc("PdhAddEnglishCounterW")
	procPdhCollectQueryData         = modPdh.NewProc("PdhCollectQueryData")
	procPdhGetFormattedCounterArray = modPdh.NewProc("PdhGetFormattedCounterArrayW")
	procPdhCloseQuery               = modPdh.NewProc("PdhCloseQuery")
)

type pdhFmtCounterValueDouble struct {
	CStatus     uint32
	DoubleValue float64
}

type pdhFmtCounterValueItemDouble struct {
	SzName   *uint16
	FmtValue pdhFmtCounterValueDouble
}

// pdhValues samples the given counters over pdhSampleWindow and returns the
// value of each counter instance, keyed by its path with any wildcard
// instance expanded. Counters that do not exist on this machine are skipped.
func pdhValues(paths ...string) (map[string]float64, bool) {
	if !procsAvailable(procPdhOpenQuery, procPdhAddEnglishCounter, procPdhCollectQueryData, procPdhGetFormattedCounterArray, procPdhCloseQuery) {
		return nil, false
	}

	var query windows.Handle
	if r, _, _ := procPdhOpenQuery.Call(0, 0, uintptr(unsafe.Pointer(&query))); r != 0 {
		return nil, false
	}
	defer func() { _, _, _ = procPdhCloseQuery.Call(uintptr(query)) }()

	counters := make(map[string]windows.Handle, len(paths))
	for _, path := range paths {
		p, err := windows.UTF16PtrFromString(path)
		if err != nil {
			continue
		}
		var counter windows.Handle
		if r, _, _ := procPdhAddEnglishCounter.Call(uintptr(query), uintptr(unsafe.Pointer(p)), 0, uintptr(unsafe.Pointer(&counter))); r != 0 {
			continue
		}
		counters[path] = counter
	}
	if len(counters) == 0 {
		return nil, false
	}

	// Rate counters are computed from two samples.
	if r, _, _ := procPdhCollectQueryData.Call(uintptr(query)); r != 0 {
		return nil, false
	}
	time.Sleep(pdhSampleWindow)
	if r, _, _ := procPdhCollectQueryData.Call(uintptr(query)); r != 0 {
		return nil, false
	}

	values := make(map[string]float64)
	for path, counter := range counters {
		readCounterArray(path, counter, values)
	}
	return values, len(values) > 0
}

// readCounterArray adds the value of every instance of counter to values.
func readCounterArray(path string, counter windows.Handle, values map[string]float64) {
	const format = pdhFmtDouble | pdhFmtNoCap100
	var size, count uint32
	r, _, _ := procPdhGetFormattedCounterArray.Call(uintptr(counter), format, uintptr(unsafe.Pointer(&size)), uintptr(unsafe.Pointer(&count)), 0)
	if r != pdhMoreData || size == 0 {
		return
	}

	// The buffer holds the items followed by their names. It is allocated
	// without pointers so the garbage collector never reads the name text
	// as one.
	buf := make([]uint64, (size+7)/8)
	r, _, _ = procPdhGetFormattedCounterArray.Call(uintptr(counter), format, uintptr(unsafe.Pointer(&size)), uintptr(unsafe.Pointer(&count)), uintptr(unsafe.Pointer(&buf[0])))
	if r != 0 || count == 0 {
		return
	}

	items := unsafe.Slice((*pdhFmtCounterValueItemDouble)(unsafe.Pointer(&buf[0])), count)
	for _, item := range items {
		if s := item.FmtValue.CStatus; s != pdhCStatusValidData && s != pdhCStatusNewData {
			continue
		}
		instance := ""
		if item.SzName != nil {
			instance = windows.UTF16PtrToString(item.SzName)
		}
		values[expandCounterPath(path, instance)] = item.FmtValue.DoubleValue
	}
	runtime.KeepAlive(buf)
}

// procsAvailable reports whether every proc can be found, since calling a
// missing one panics.
func procsAvailable(procs ...*windows.LazyProc) bool {
	for _, p := range procs {
		if p.Find() != nil {
			return false
		}
	}
	return true
}
