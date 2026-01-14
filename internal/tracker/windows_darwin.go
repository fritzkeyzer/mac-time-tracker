//go:build darwin

package tracker

/*
#cgo CFLAGS: -x objective-c
#cgo LDFLAGS: -framework Cocoa -framework CoreGraphics -framework ApplicationServices
#include "windows_darwin.h"
*/
import "C"
import (
	"unsafe"
)

type WindowInfo struct {
	AppName     string
	RawAppName  string
	WindowTitle string
	IsActive    bool
}

func getWindows() ([]WindowInfo, error) {
	// Call the C function to get window list
	windowList := C.getWindowList()
	defer C.freeWindowList(windowList)

	if windowList.count == 0 {
		return []WindowInfo{}, nil
	}

	// Convert C array to Go slice
	windows := make([]WindowInfo, 0, int(windowList.count))
	cWindows := unsafe.Slice(windowList.windows, windowList.count)

	for i := 0; i < int(windowList.count); i++ {
		cWin := cWindows[i]

		windows = append(windows, WindowInfo{
			AppName:     C.GoString(cWin.appName),
			RawAppName:  C.GoString(cWin.appName), // CoreGraphics gives us the display name
			WindowTitle: C.GoString(cWin.windowTitle),
			IsActive:    cWin.isActive == 1,
		})
	}

	return windows, nil
}

// HasAccessibilityPermission checks if the app has Accessibility permission
func HasAccessibilityPermission() bool {
	return C.hasAccessibilityPermission() == 1
}

// HasScreenRecordingPermission checks if the app has Screen Recording permission
func HasScreenRecordingPermission() bool {
	return C.hasScreenRecordingPermission() == 1
}
