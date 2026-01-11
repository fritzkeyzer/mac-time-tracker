package store

import (
	"database/sql"
	"errors"
	"fmt"
	"time"
)

type Store struct {
	db *sql.DB
}

func NewStore(db *sql.DB) *Store {
	return &Store{db: db}
}

type WindowInfo struct {
	AppName     string // Displayed Name
	RawAppName  string // Process Name
	WindowTitle string
	IsActive    bool
}

// AppSpan represents an application-level tracking span
type AppSpan struct {
	ID          int64
	AppName     string
	StartedAt   int64
	LastSeenAt  int64
	EndedAt     sql.NullInt64
	FocusCount  int64
	SampleCount int64
}

// WindowSpan represents a window-level tracking span
type WindowSpan struct {
	ID          int64
	AppName     string
	WindowTitle string
	StartedAt   int64
	LastSeenAt  int64
	EndedAt     sql.NullInt64
	FocusCount  int64
	SampleCount int64
}

// IdlePeriod represents a period of user inactivity
type IdlePeriod struct {
	ID        int64
	StartedAt int64
	EndedAt   sql.NullInt64
}

// FindOpenAppSpan finds an open span for the given app
func (s *Store) FindOpenAppSpan(appName string) (*AppSpan, error) {
	query := `SELECT id, app_name, started_at, last_seen_at, ended_at, focus_count, sample_count
	          FROM app_spans
	          WHERE app_name = ? AND ended_at IS NULL`

	var span AppSpan
	err := s.db.QueryRow(query, appName).Scan(
		&span.ID, &span.AppName, &span.StartedAt, &span.LastSeenAt,
		&span.EndedAt, &span.FocusCount, &span.SampleCount,
	)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}
	return &span, nil
}

// CreateAppSpan creates a new app span
func (s *Store) CreateAppSpan(appName string, startedAt int64, isFocused bool) (int64, error) {
	focusCount := 0
	if isFocused {
		focusCount = 1
	}

	result, err := s.db.Exec(
		`INSERT INTO app_spans (app_name, started_at, last_seen_at, sample_count, focus_count)
		 VALUES (?, ?, ?, 1, ?)`,
		appName, startedAt, startedAt, focusCount,
	)
	if err != nil {
		return 0, err
	}
	return result.LastInsertId()
}

// UpdateAppSpan updates last_seen_at and counts
func (s *Store) UpdateAppSpan(id int64, lastSeenAt int64, isFocused bool) error {
	focusIncrement := 0
	if isFocused {
		focusIncrement = 1
	}

	_, err := s.db.Exec(
		`UPDATE app_spans
		 SET last_seen_at = ?, sample_count = sample_count + 1, focus_count = focus_count + ?
		 WHERE id = ?`,
		lastSeenAt, focusIncrement, id,
	)
	return err
}

// EndAppSpan closes a span
func (s *Store) EndAppSpan(id int64, endedAt int64) error {
	_, err := s.db.Exec(
		`UPDATE app_spans SET ended_at = ? WHERE id = ?`,
		endedAt, id,
	)
	return err
}

// FindOpenWindowSpan finds an open span for the given app+window
func (s *Store) FindOpenWindowSpan(appName, windowTitle string) (*WindowSpan, error) {
	query := `SELECT id, app_name, window_title, started_at, last_seen_at, ended_at, focus_count, sample_count
	          FROM window_spans
	          WHERE app_name = ? AND window_title = ? AND ended_at IS NULL`

	var span WindowSpan
	err := s.db.QueryRow(query, appName, windowTitle).Scan(
		&span.ID, &span.AppName, &span.WindowTitle, &span.StartedAt, &span.LastSeenAt,
		&span.EndedAt, &span.FocusCount, &span.SampleCount,
	)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}
	return &span, nil
}

// CreateWindowSpan creates a new window span
func (s *Store) CreateWindowSpan(appName, windowTitle string, startedAt int64, isFocused bool) (int64, error) {
	focusCount := 0
	if isFocused {
		focusCount = 1
	}

	result, err := s.db.Exec(
		`INSERT INTO window_spans (app_name, window_title, started_at, last_seen_at, sample_count, focus_count)
		 VALUES (?, ?, ?, ?, 1, ?)`,
		appName, windowTitle, startedAt, startedAt, focusCount,
	)
	if err != nil {
		return 0, err
	}
	return result.LastInsertId()
}

// UpdateWindowSpan updates last_seen_at and counts
func (s *Store) UpdateWindowSpan(id int64, lastSeenAt int64, isFocused bool) error {
	focusIncrement := 0
	if isFocused {
		focusIncrement = 1
	}

	_, err := s.db.Exec(
		`UPDATE window_spans
		 SET last_seen_at = ?, sample_count = sample_count + 1, focus_count = focus_count + ?
		 WHERE id = ?`,
		lastSeenAt, focusIncrement, id,
	)
	return err
}

// EndWindowSpan closes a span
func (s *Store) EndWindowSpan(id int64, endedAt int64) error {
	_, err := s.db.Exec(
		`UPDATE window_spans SET ended_at = ? WHERE id = ?`,
		endedAt, id,
	)
	return err
}

// FindOpenIdlePeriod finds an active idle period
func (s *Store) FindOpenIdlePeriod() (*IdlePeriod, error) {
	query := `SELECT id, started_at, ended_at
	          FROM idle_periods
	          WHERE ended_at IS NULL
	          ORDER BY id DESC
	          LIMIT 1`

	var period IdlePeriod
	err := s.db.QueryRow(query).Scan(&period.ID, &period.StartedAt, &period.EndedAt)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}
	return &period, nil
}

// CreateIdlePeriod starts a new idle period
func (s *Store) CreateIdlePeriod(startedAt int64) (int64, error) {
	result, err := s.db.Exec(
		`INSERT INTO idle_periods (started_at) VALUES (?)`,
		startedAt,
	)
	if err != nil {
		return 0, err
	}
	return result.LastInsertId()
}

// EndIdlePeriod closes the idle period
func (s *Store) EndIdlePeriod(id int64, endedAt int64) error {
	_, err := s.db.Exec(
		`UPDATE idle_periods SET ended_at = ? WHERE id = ?`,
		endedAt, id,
	)
	return err
}

// EndStaleAppSpans closes app spans not seen recently
func (s *Store) EndStaleAppSpans(staleThreshold int64) error {
	_, err := s.db.Exec(
		`UPDATE app_spans
		 SET ended_at = last_seen_at
		 WHERE ended_at IS NULL AND last_seen_at < ?`,
		staleThreshold,
	)
	return err
}

// EndStaleWindowSpans closes window spans not seen recently
func (s *Store) EndStaleWindowSpans(staleThreshold int64) error {
	_, err := s.db.Exec(
		`UPDATE window_spans
		 SET ended_at = last_seen_at
		 WHERE ended_at IS NULL AND last_seen_at < ?`,
		staleThreshold,
	)
	return err
}

// EndAllOpenAppSpans closes all open app spans
func (s *Store) EndAllOpenAppSpans() error {
	_, err := s.db.Exec(
		`UPDATE app_spans SET ended_at = last_seen_at WHERE ended_at IS NULL`,
	)
	return err
}

// EndAllOpenWindowSpans closes all open window spans
func (s *Store) EndAllOpenWindowSpans() error {
	_, err := s.db.Exec(
		`UPDATE window_spans SET ended_at = last_seen_at WHERE ended_at IS NULL`,
	)
	return err
}

// ProcessSnapshot processes a snapshot according to the polling logic
func (s *Store) ProcessSnapshot(windows []WindowInfo, idleSeconds float64, idleThresholdSeconds float64, staleThresholdSeconds int64, wasIdlePreviously *bool) error {
	now := time.Now().Unix()

	// Step 2: Check idle threshold
	if idleSeconds > idleThresholdSeconds {
		// User is idle
		if !*wasIdlePreviously {
			// Just became idle - end all open spans
			if err := s.EndAllOpenAppSpans(); err != nil {
				return fmt.Errorf("end all app spans: %w", err)
			}
			if err := s.EndAllOpenWindowSpans(); err != nil {
				return fmt.Errorf("end all window spans: %w", err)
			}

			// Start idle period
			_, err := s.CreateIdlePeriod(now)
			if err != nil {
				return fmt.Errorf("create idle period: %w", err)
			}
		} else {
			// Still idle - idle period already exists, nothing to do
		}

		*wasIdlePreviously = true
		// Skip rest of processing
		return nil
	}

	// User is not idle
	if *wasIdlePreviously {
		// Just returned from idle - end idle period
		idlePeriod, err := s.FindOpenIdlePeriod()
		if err != nil {
			return fmt.Errorf("find open idle period: %w", err)
		}
		if idlePeriod != nil {
			if err := s.EndIdlePeriod(idlePeriod.ID, now); err != nil {
				return fmt.Errorf("end idle period: %w", err)
			}
		}
		*wasIdlePreviously = false
	}

	// Step 3: Process all apps
	// Build a set of unique app names
	appsSeen := make(map[string]bool)
	for _, w := range windows {
		appsSeen[w.AppName] = true
	}

	for appName := range appsSeen {
		// Determine if this app is focused
		isFocused := false
		for _, w := range windows {
			if w.AppName == appName && w.IsActive {
				isFocused = true
				break
			}
		}

		// Find or create app span
		span, err := s.FindOpenAppSpan(appName)
		if err != nil {
			return fmt.Errorf("find open app span: %w", err)
		}

		if span != nil {
			// Update existing span
			if err := s.UpdateAppSpan(span.ID, now, isFocused); err != nil {
				return fmt.Errorf("update app span: %w", err)
			}
		} else {
			// Create new span
			_, err := s.CreateAppSpan(appName, now, isFocused)
			if err != nil {
				return fmt.Errorf("create app span: %w", err)
			}
		}
	}

	// Step 4: Process all windows
	for _, w := range windows {
		// Find or create window span
		span, err := s.FindOpenWindowSpan(w.AppName, w.WindowTitle)
		if err != nil {
			return fmt.Errorf("find open window span: %w", err)
		}

		if span != nil {
			// Update existing span
			if err := s.UpdateWindowSpan(span.ID, now, w.IsActive); err != nil {
				return fmt.Errorf("update window span: %w", err)
			}
		} else {
			// Create new span
			_, err := s.CreateWindowSpan(w.AppName, w.WindowTitle, now, w.IsActive)
			if err != nil {
				return fmt.Errorf("create window span: %w", err)
			}
		}
	}

	// Step 5: Close stale spans
	staleThreshold := now - staleThresholdSeconds
	if err := s.EndStaleAppSpans(staleThreshold); err != nil {
		return fmt.Errorf("end stale app spans: %w", err)
	}
	if err := s.EndStaleWindowSpans(staleThreshold); err != nil {
		return fmt.Errorf("end stale window spans: %w", err)
	}

	return nil
}
