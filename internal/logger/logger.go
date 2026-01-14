package logger

import (
	"os"
	"path/filepath"
	"sync"
	"time"
)

// DailyLogWriter is a lightweight io.Writer that logs to an output file, automatically rotating daily.
type DailyLogWriter struct {
	Dir         string
	currentFile *os.File
	currentDate string
	mu          sync.Mutex
}

func (w *DailyLogWriter) Write(p []byte) (n int, err error) {
	w.mu.Lock()
	defer w.mu.Unlock()

	today := time.Now().Format("2006-01-02")
	if w.currentDate != today {
		if w.currentFile != nil {
			// Ignore close error, we are writing
			_ = w.currentFile.Close()
		}

		filename := filepath.Join(w.Dir, today+".jsonl")
		f, err := os.OpenFile(filename, os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0644)
		if err != nil {
			return 0, err
		}
		w.currentFile = f
		w.currentDate = today
	}

	return w.currentFile.Write(p)
}

func (w *DailyLogWriter) Close() error {
	w.mu.Lock()
	defer w.mu.Unlock()
	if w.currentFile != nil {
		return w.currentFile.Close()
	}
	return nil
}
