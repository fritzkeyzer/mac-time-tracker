//go:build darwin

package daemon

import "github.com/fritzkeyzer/mac-time-tracker/internal/tracker"

func hasAccessibilityPermission() bool {
	return tracker.HasAccessibilityPermission()
}

func hasScreenRecordingPermission() bool {
	return tracker.HasScreenRecordingPermission()
}
