package tracker

import (
	"fmt"
	"log/slog"
	"os/exec"
	"strconv"
	"strings"
	"time"

	"github.com/fritzkeyzer/mac-time-tracker/internal/store"
)

// wasIdlePreviously tracks the idle state from the previous poll
var wasIdlePreviously bool

// CollectAndLog collects the current window state and logs it to the store.
// This implements the polling logic as specified in logic.md
func CollectAndLog(s *store.Store, idleThreshold, staleThreshold time.Duration) error {
	// Step 1: Get current snapshot
	idleSeconds, err := getIdleTime()
	if err != nil {
		return fmt.Errorf("idle time error: %w", err)
	}

	windows, err := getWindows()
	if err != nil {
		return fmt.Errorf("window list error: %w", err)
	}

	if len(windows) == 0 {
		slog.Warn("No windows found, are permissions correctly configured?")
		// Even with no windows, we should still process idle logic
		// Continue with empty windows list
	}

	// Convert thresholds to appropriate units
	idleThresholdSeconds := idleThreshold.Seconds()
	staleThresholdSeconds := int64(staleThreshold.Seconds())

	// Process the snapshot using the store's ProcessSnapshot method
	err = s.ProcessSnapshot(windows, idleSeconds, idleThresholdSeconds, staleThresholdSeconds, &wasIdlePreviously)
	if err != nil {
		return fmt.Errorf("process snapshot: %w", err)
	}

	// Log the state
	if idleSeconds > idleThresholdSeconds {
		slog.Debug("User idle", "idle_seconds", idleSeconds)
	} else {
		activeApp := "none"
		for _, w := range windows {
			if w.IsActive {
				activeApp = w.AppName
				break
			}
		}
		slog.Debug("Logged state", "active_app", activeApp, "window_count", len(windows), "idle_seconds", idleSeconds)
	}

	return nil
}

func getIdleTime() (float64, error) {
	// ioreg returns nanoseconds since last input
	out, err := exec.Command("ioreg", "-c", "IOHIDSystem").Output()
	if err != nil {
		return 0, err
	}

	lines := strings.Split(string(out), "\n")
	for _, line := range lines {
		line = strings.TrimSpace(line)
		if strings.Contains(line, "\"HIDIdleTime\" =") {
			parts := strings.Split(line, "=")
			if len(parts) == 2 {
				nanosStr := strings.TrimSpace(parts[1])
				nanos, err := strconv.ParseInt(nanosStr, 10, 64)
				if err != nil {
					return 0, err
				}
				return float64(nanos) / 1e9, nil
			}
		}
	}
	return 0, fmt.Errorf("HIDIdleTime not found")
}

// getWindows is implemented in windows_darwin.go using native macOS APIs
