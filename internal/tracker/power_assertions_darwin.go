//go:build darwin

package tracker

/*
#cgo CFLAGS: -x objective-c
#cgo LDFLAGS: -framework Foundation -framework IOKit
#include "power_assertions_darwin.h"
*/
import "C"
import (
	"unsafe"
)

// PowerAssertionInfo represents a single power assertion
type PowerAssertionInfo struct {
	ProcessName   string
	PID           int32
	AssertionType string
}

// HasActivePowerAssertions checks if any NoDisplaySleep assertions exist.
// Returns true if apps are preventing display sleep (e.g., Zoom, video playback).
func HasActivePowerAssertions() (bool, error) {
	result := C.hasActivePowerAssertions()
	return result == 1, nil
}

// GetPowerAssertions returns all active power assertions for debugging/logging.
func GetPowerAssertions() ([]PowerAssertionInfo, error) {
	assertionList := C.getPowerAssertions()
	defer C.freePowerAssertionList(assertionList)

	if assertionList.count == 0 {
		return []PowerAssertionInfo{}, nil
	}

	assertions := make([]PowerAssertionInfo, 0, int(assertionList.count))
	cAssertions := unsafe.Slice(assertionList.assertions, assertionList.count)

	for i := 0; i < int(assertionList.count); i++ {
		cAssertion := cAssertions[i]

		assertions = append(assertions, PowerAssertionInfo{
			ProcessName:   C.GoString(cAssertion.processName),
			PID:           int32(cAssertion.pid),
			AssertionType: C.GoString(cAssertion.assertionType),
		})
	}

	return assertions, nil
}
