//go:build darwin

package tracker

import (
	"fmt"
	"os/exec"
	"strconv"
	"strings"
)

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
