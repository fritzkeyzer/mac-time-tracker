package logger

import (
	"bufio"
	"io"
	"os"
	"path/filepath"
	"sync"
	"time"
)

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

// TailLogs tails the current day's log file and writes to out.
// It follows the file (like tail -f).
func TailLogs(dir string, out io.Writer) error {
	today := time.Now().Format("2006-01-02")
	filename := filepath.Join(dir, today+".jsonl")

	// Wait for file to exist
	for {
		if _, err := os.Stat(filename); err == nil {
			break
		}
		time.Sleep(1 * time.Second)
	}

	f, err := os.Open(filename)
	if err != nil {
		return err
	}
	defer f.Close()

	r := bufio.NewReader(f)
	for {
		line, err := r.ReadBytes('\n')
		if len(line) > 0 {
			out.Write(line)
		}
		if err == io.EOF {
			time.Sleep(500 * time.Millisecond)
			continue
		}
		if err != nil {
			return err
		}
	}
}
