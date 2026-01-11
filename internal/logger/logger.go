package logger

import (
	"bufio"
	"encoding/json"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"sort"
	"strings"
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

// ANSI color codes
const (
	colorReset   = "\033[0m"
	colorDimGrey = "\033[90m"
	colorRed     = "\033[91m"
	colorYellow  = "\033[93m"
	colorGreen   = "\033[92m"
	colorCyan    = "\033[96m"
	colorWhite   = "\033[97m"
)

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
			formatLogLine(out, line)
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

func formatLogLine(out io.Writer, line []byte) {
	var logEntry map[string]interface{}
	if err := json.Unmarshal(line, &logEntry); err != nil {
		// If we can't parse JSON, just write the raw line
		out.Write(line)
		return
	}

	// Extract standard fields
	timestamp, _ := logEntry["time"].(string)
	level, _ := logEntry["level"].(string)
	msg, _ := logEntry["msg"].(string)
	cmd, _ := logEntry["cmd"].(string)
	switch cmd {
	case "open":
		cmd = "WEB_UI"
	default:
		cmd = strings.ToUpper(cmd)
	}

	// Format timestamp
	formattedTime := timestamp
	if t, err := time.Parse(time.RFC3339Nano, timestamp); err == nil {
		formattedTime = t.Format("2006-01-02T15:04:05")
	}

	// Color the level
	levelColor := colorWhite
	switch strings.ToUpper(level) {
	case "DEBUG":
		levelColor = colorCyan
	case "INFO":
		levelColor = colorGreen
	case "WARN", "WARNING":
		levelColor = colorYellow
	case "ERROR":
		levelColor = colorRed
	}

	// Print main line: timestamp (dim grey) + level (colored) + message
	fmt.Fprintf(out, "%s%s%s %s%s%s %s%s%s %s\n",
		colorDimGrey, formattedTime, colorReset,
		levelColor, strings.ToUpper(level), colorReset,
		levelColor, cmd, colorReset,
		msg)

	// Print additional fields (sorted for consistent output)
	additionalFields := make([]string, 0)
	for key := range logEntry {
		if key != "time" && key != "level" && key != "msg" && key != "cmd" {
			additionalFields = append(additionalFields, key)
		}
	}
	sort.Strings(additionalFields)

	for _, key := range additionalFields {
		value := logEntry[key]
		// Format value based on type
		var formattedValue string
		switch v := value.(type) {
		case string:
			formattedValue = v
		case float64:
			formattedValue = fmt.Sprintf("%v", v)
		case bool:
			formattedValue = fmt.Sprintf("%v", v)
		default:
			// For complex types, use JSON
			if jsonBytes, err := json.Marshal(v); err == nil {
				formattedValue = string(jsonBytes)
			} else {
				formattedValue = fmt.Sprintf("%v", v)
			}
		}
		fmt.Fprintf(out, "\t%s: %s\n", key, formattedValue)
	}
}
