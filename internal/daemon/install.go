package daemon

import (
	"fmt"
	"io"
	"os"
	"os/exec"
	"path/filepath"
	"strconv"
	"text/template"
	"time"
)

const plistTemplate =
// language=xml
`<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.fritzkeyzer.mac-time-tracker</string>
    <key>ProgramArguments</key>
    <array>
        <string>{{.BinaryPath}}</string>
        <string>daemon</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>StandardOutPath</key>
    <string>{{.LogPath}}/tracker.out</string>
    <key>StandardErrorPath</key>
    <string>{{.LogPath}}/tracker.err</string>
    <key>WorkingDirectory</key>
    <string>{{.WorkDir}}</string>
</dict>
</plist>
`

const infoPlistTemplate =
// language=xml
`<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>CFBundleIdentifier</key>
    <string>com.fritzkeyzer.mac-time-tracker</string>
    <key>CFBundleName</key>
    <string>MacTimeTracker</string>
    <key>CFBundlePackageType</key>
    <string>APPL</string>
    <key>CFBundleExecutable</key>
    <string>mac-time-tracker</string>
    <key>LSUIElement</key>
    <true/>
    <key>NSScreenCaptureUsageDescription</key>
    <string>MacTimeTracker needs screen recording permission to read window titles for time tracking.</string>
</dict>
</plist>
`

type plistData struct {
	BinaryPath string
	LogPath    string
	WorkDir    string
}

func InstallLaunchAgent(logDir, workDir string) error {
	homeDir, err := os.UserHomeDir()
	if err != nil {
		return fmt.Errorf("failed to get user home dir: %w", err)
	}

	uid := strconv.Itoa(os.Getuid())
	domainTarget := "gui/" + uid
	serviceLabel := "com.fritzkeyzer.mac-time-tracker"
	plistPath := filepath.Join(homeDir, "Library/LaunchAgents/com.fritzkeyzer.mac-time-tracker.plist")

	// 1. Comprehensively stop any running instances
	fmt.Println("Stopping any existing service instances...")

	// Try to stop the service using bootout with different variations
	_ = exec.Command("launchctl", "bootout", domainTarget+"/"+serviceLabel).Run()
	_ = exec.Command("launchctl", "bootout", domainTarget, plistPath).Run()
	_ = exec.Command("launchctl", "bootout", domainTarget, serviceLabel).Run()

	// Try to kill the service if it's still running
	_ = exec.Command("launchctl", "kill", "SIGTERM", domainTarget+"/"+serviceLabel).Run()

	// Try older-style unload (for compatibility)
	if _, err := os.Stat(plistPath); err == nil {
		_ = exec.Command("launchctl", "unload", plistPath).Run()
	}

	// Kill any running processes by name
	_ = exec.Command("pkill", "-9", "-f", "MacTimeTracker.app").Run()
	_ = exec.Command("pkill", "-9", "mac-time-tracker").Run()

	// Wait a moment for processes to fully terminate
	time.Sleep(1 * time.Second)

	// Verify it's stopped
	if err := exec.Command("launchctl", "list", serviceLabel).Run(); err == nil {
		fmt.Println("Warning: Service may still be running, but proceeding with installation...")
	} else {
		fmt.Println("Service successfully stopped.")
	}

	// 3. Create App Bundle
	fmt.Println("Creating App Bundle structure...")
	appDir := filepath.Join(homeDir, "Applications", "MacTimeTracker.app")
	contentsDir := filepath.Join(appDir, "Contents")
	macosDir := filepath.Join(contentsDir, "MacOS")
	if err := os.MkdirAll(macosDir, 0755); err != nil {
		return fmt.Errorf("failed to create app bundle dirs: %w", err)
	}

	// 4. Create Info.plist
	fmt.Println("Creating Info.plist...")
	if err := os.WriteFile(filepath.Join(contentsDir, "Info.plist"), []byte(infoPlistTemplate), 0644); err != nil {
		return fmt.Errorf("failed to create Info.plist: %w", err)
	}

	// 5. Copy Binary
	srcBin, err := os.Executable()
	if err != nil {
		return fmt.Errorf("failed to get executable path: %w", err)
	}
	destBin := filepath.Join(macosDir, "mac-time-tracker")

	fmt.Printf("Copying binary from %s to %s...\n", srcBin, destBin)
	if err := copyFile(srcBin, destBin); err != nil {
		return fmt.Errorf("failed to copy binary: %w", err)
	}
	if err := os.Chmod(destBin, 0755); err != nil {
		return fmt.Errorf("failed to chmod binary: %w", err)
	}

	// 6. Sign the App Bundle
	fmt.Println("Signing the App Bundle...")
	signCmd := exec.Command("codesign", "--force", "--deep", "-s", "-", "--identifier", serviceLabel, appDir)
	if out, err := signCmd.CombinedOutput(); err != nil {
		return fmt.Errorf("failed to sign app bundle: %s, output: %s", err, string(out))
	}

	// 7. Create LaunchAgent Plist
	fmt.Println("Creating LaunchAgent plist...")
	data := plistData{
		BinaryPath: destBin,
		LogPath:    logDir,
		WorkDir:    workDir,
	}

	f, err := os.Create(plistPath)
	if err != nil {
		return fmt.Errorf("failed to create plist file: %w", err)
	}
	tmpl, err := template.New("plist").Parse(plistTemplate)
	if err != nil {
		f.Close()
		return fmt.Errorf("failed to parse template: %w", err)
	}
	if err := tmpl.Execute(f, data); err != nil {
		f.Close()
		return fmt.Errorf("failed to write plist: %w", err)
	}
	f.Close()

	// 8. Start Service (Bootstrap)
	fmt.Println("Starting service (launchctl bootstrap)...")
	cmd := exec.Command("launchctl", "bootstrap", domainTarget, plistPath)
	if out, err := cmd.CombinedOutput(); err != nil {
		return fmt.Errorf("failed to bootstrap service: %s, output: %s", err, string(out))
	}

	fmt.Printf("Success! Service started. App installed and signed at: %s\n", appDir)

	// 9. Check permissions and guide user to grant them
	checkAndPromptPermissions()

	return nil
}

func copyFile(src, dst string) error {
	sourceFile, err := os.Open(src)
	if err != nil {
		return err
	}
	defer sourceFile.Close()

	destFile, err := os.Create(dst)
	if err != nil {
		return err
	}
	defer destFile.Close()

	_, err = io.Copy(destFile, sourceFile)
	return err
}

func checkAndPromptPermissions() {
	fmt.Println()

	// Open Screen Recording settings
	fmt.Println("⚠️  Screen Recording permission is required to track windows")
	fmt.Println("   Please ensure that it is enabled in System Preferences > Security & Privacy > Privacy > Screen Recording")
	fmt.Println("   You might need to add 'MacTimeTracker' manually")
	_ = exec.Command("open", "x-apple.systempreferences:com.apple.preference.security?Privacy_ScreenCapture").Run()
}
