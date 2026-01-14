package tracker

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"log/slog"
	"time"

	"github.com/fritzkeyzer/mac-time-tracker/internal/store"
)

var prevIdleState = false
var prevPowerState = false

// CollectAndLog collects the current window state and logs it to the store.
// This implements the polling logic as specified in logic.md
func CollectAndLog(ctx context.Context, db *store.Queries, idleThreshold, staleThreshold time.Duration) error {
	// idle check
	idleSeconds, err := GetIdleTime()
	if err != nil {
		return fmt.Errorf("idle time error: %w", err)
	}
	isIdle := idleSeconds > idleThreshold.Seconds()

	// Check if we should consider the user idle
	hasPowerAssertions, err := HasActivePowerAssertions()
	if err != nil {
		slog.Warn("Failed to check power assertions", "error", err)
	}

	defer func() {
		prevIdleState = isIdle
		prevPowerState = hasPowerAssertions
	}()

	if isIdle != prevIdleState || hasPowerAssertions != prevPowerState {
		slog.Debug("Idle changed",
			"isIdle", isIdle,
			"threshold", idleThreshold.Seconds(),
			"idleSeconds", idleSeconds,
			"hasPowerAssertions", hasPowerAssertions,
		)
	}

	if isIdle && !hasPowerAssertions {
		return nil
	}

	// get open windows
	windows, err := GetWindows()
	if err != nil {
		return fmt.Errorf("window list error: %w", err)
	}
	if len(windows) == 0 {
		slog.Warn("No windows found, are permissions correctly configured?")
		return nil
	}

	// get active app and window
	activeApp := ""
	activeWindow := ""
	for _, window := range windows {
		if window.IsActive {
			activeApp = window.AppName
			activeWindow = window.WindowTitle
			break
		}
	}
	if activeApp == "" || activeWindow == "" {
		slog.Warn("App or Window name not found", "app", activeApp, "window", activeWindow)
		return nil
	}

	// at this point we have a valid active app and window and are not idling
	err = saveFocused(ctx, db, activeApp, activeWindow, staleThreshold)
	if err != nil {
		return fmt.Errorf("save focused window error: %w", err)
	}

	return nil
}

func saveFocused(ctx context.Context, db *store.Queries, activeApp, activeWindow string, staleThreshold time.Duration) error {
	latestSpan, err := db.SelectLatestSpan(ctx)
	if err != nil && !errors.Is(err, sql.ErrNoRows) {
		return fmt.Errorf("select latest span: %w", err)
	}

	hasPrevious := latestSpan.ID > 0
	spanMatch := latestSpan.AppName == activeApp && latestSpan.WindowTitle == activeWindow
	spanStale := time.Now().Unix()-latestSpan.EndAt > int64(staleThreshold.Seconds())

	// update span (only if the previous span exists, matches and is not stale)
	if hasPrevious && spanMatch && !spanStale {
		latestSpan, err = db.UpdateSpan(ctx, store.UpdateSpanParams{
			ID:    latestSpan.ID,
			EndAt: time.Now().Unix(),
		})
		if err != nil {
			return fmt.Errorf("update span: %w", err)
		}

		slog.Debug("Updated span", "app", activeApp, "window", activeWindow)

		return nil
	}

	// otherwise create a new span
	latestSpan, err = db.InsertSpan(ctx, store.InsertSpanParams{
		AppName:     activeApp,
		WindowTitle: activeWindow,
		StartAt:     time.Now().Unix(),
		EndAt:       time.Now().Unix(),
	})
	if err != nil {
		return fmt.Errorf("insert span: %w", err)
	}

	slog.Debug("New span", "app", activeApp, "window", activeWindow)

	return nil
}
