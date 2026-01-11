package daemon

import (
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strconv"
	"time"
)

func UninstallLaunchAgent(removeData bool) error {
	homeDir, err := os.UserHomeDir()
	if err != nil {
		return fmt.Errorf("failed to get user home dir: %w", err)
	}

	uid := strconv.Itoa(os.Getuid())
	domainTarget := "gui/" + uid
	serviceLabel := "com.fritzkeyzer.mac-time-tracker"
	plistPath := filepath.Join(homeDir, "Library/LaunchAgents/com.fritzkeyzer.mac-time-tracker.plist")
	appDir := filepath.Join(homeDir, "Applications", "MacTimeTracker.app")
	workDir := filepath.Join(homeDir, ".mac-time-tracker")

	// 1. Stop the service
	fmt.Println("Stopping service...")
	_ = exec.Command("launchctl", "bootout", domainTarget+"/"+serviceLabel).Run()
	_ = exec.Command("launchctl", "bootout", domainTarget, plistPath).Run()
	_ = exec.Command("launchctl", "bootout", domainTarget, serviceLabel).Run()
	_ = exec.Command("launchctl", "kill", "SIGTERM", domainTarget+"/"+serviceLabel).Run()

	// Try older-style unload for compatibility
	if _, err := os.Stat(plistPath); err == nil {
		_ = exec.Command("launchctl", "unload", plistPath).Run()
	}

	// Kill any running processes
	_ = exec.Command("pkill", "-9", "-f", "MacTimeTracker.app").Run()
	_ = exec.Command("pkill", "-9", "mac-time-tracker").Run()

	// Wait for processes to terminate
	time.Sleep(1 * time.Second)

	// 2. Remove LaunchAgent plist
	fmt.Println("Removing LaunchAgent plist...")
	if _, err := os.Stat(plistPath); err == nil {
		if err := os.Remove(plistPath); err != nil {
			fmt.Printf("Warning: failed to remove plist: %v\n", err)
		} else {
			fmt.Printf("Removed: %s\n", plistPath)
		}
	} else {
		fmt.Println("LaunchAgent plist not found (already removed)")
	}

	// 3. Remove App Bundle
	fmt.Println("Removing App Bundle...")
	if _, err := os.Stat(appDir); err == nil {
		if err := os.RemoveAll(appDir); err != nil {
			fmt.Printf("Warning: failed to remove app bundle: %v\n", err)
		} else {
			fmt.Printf("Removed: %s\n", appDir)
		}
	} else {
		fmt.Println("App bundle not found (already removed)")
	}

	// 4. Optionally remove user data
	if removeData {
		fmt.Println("Removing user data...")
		if _, err := os.Stat(workDir); err == nil {
			if err := os.RemoveAll(workDir); err != nil {
				fmt.Printf("Warning: failed to remove user data: %v\n", err)
			} else {
				fmt.Printf("Removed: %s\n", workDir)
			}
		} else {
			fmt.Println("User data directory not found (already removed)")
		}
	} else {
		fmt.Printf("User data preserved at: %s\n", workDir)
	}

	fmt.Println("\nUninstall complete!")
	return nil
}
