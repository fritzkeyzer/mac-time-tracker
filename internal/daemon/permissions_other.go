//go:build !darwin

package daemon

func hasAccessibilityPermission() bool {
	return true // Not applicable on non-macOS platforms
}

func hasScreenRecordingPermission() bool {
	return true // Not applicable on non-macOS platforms
}
