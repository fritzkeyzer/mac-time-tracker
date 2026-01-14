package main

import (
	"context"
	"fmt"
	"log/slog"
	"os"
	"os/signal"
	"path/filepath"
	"syscall"
	"time"

	"github.com/fritzkeyzer/mac-time-tracker/internal/daemon"
	"github.com/fritzkeyzer/mac-time-tracker/internal/logger"
	"github.com/fritzkeyzer/mac-time-tracker/internal/store"
	"github.com/fritzkeyzer/mac-time-tracker/internal/tracker"
	"github.com/fritzkeyzer/mac-time-tracker/internal/web_ui"
)

const (
	pollInterval   = 10 * time.Second
	idleThreshold  = 5 * time.Minute
	staleThreshold = 10 * time.Minute
)

func main() {
	ctx := context.Background()

	homeDir, err := os.UserHomeDir()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Failed to get user home dir: %v\n", err)
		os.Exit(1)
	}

	workDir := filepath.Join(homeDir, ".mac-time-tracker") // ~/.mac-time-tracker
	logDir := filepath.Join(workDir, "logs")               // ~/.mac-time-tracker/logs
	dbPath := filepath.Join(workDir, "tracker.sqlite")     // ~/.mac-time-tracker/tracker.sqlite

	if err := os.MkdirAll(logDir, os.ModePerm); err != nil {
		fmt.Fprintf(os.Stderr, "Failed to create log dir: %v\n", err)
		os.Exit(1)
	}

	// the default command is daemon
	cmd := ""
	if len(os.Args) >= 2 {
		cmd = os.Args[1]
	} else {
		printUsage()
		os.Exit(1)
	}

	// init slog
	logWriter := &logger.DailyLogWriter{Dir: logDir}
	handler := slog.NewJSONHandler(logWriter, &slog.HandlerOptions{Level: slog.LevelDebug})
	l := slog.New(handler).With("cmd", cmd)
	slog.SetDefault(l)

	// init DB
	db, dbCloseFn, err := store.InitDB(dbPath)
	if err != nil {
		slog.Error("Failed to init DB", "error", err)
		os.Exit(1)
	}
	defer dbCloseFn()

	switch cmd {
	case "daemon":
		runDaemon(ctx, db)
	case "init":
		runInit(logDir, workDir)
	case "logs":
		runLogs(logDir)
	case "open":
		runOpen(ctx, db)
	case "uninstall":
		runUninstall()
	default:
		fmt.Printf("Unknown command: %s\n", cmd)
		printUsage()
		os.Exit(1)
	}
}

func printUsage() {
	fmt.Println("Usage: mac-time-tracker <command>")
	fmt.Println("Commands:")
	fmt.Println("  daemon     Run the tracker daemon")
	fmt.Println("  init       Install LaunchAgent")
	fmt.Println("  logs       Tail logs")
	fmt.Println("  open       Open web UI")
	fmt.Println("  uninstall  Remove app bundle, plist, and optionally user data")
}

func runDaemon(ctx context.Context, db *store.Queries) {
	// Handle graceful shutdown
	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, syscall.SIGINT, syscall.SIGTERM)

	slog.Info("Daemon started")

	// Initial collection
	if err := tracker.CollectAndLog(ctx, db, idleThreshold, staleThreshold); err != nil {
		slog.Error("Error collecting initial data", "error", err)
	}

	ticker := time.NewTicker(pollInterval)
	defer ticker.Stop()

	for {
		select {
		case <-ticker.C:
			if err := tracker.CollectAndLog(ctx, db, idleThreshold, staleThreshold); err != nil {
				slog.Error("Error collecting data", "error", err)
			}
		case <-sigChan:
			slog.Info("Shutting down")
			return
		}
	}
}

func runInit(logDir, workDir string) {
	if err := daemon.InstallLaunchAgent(logDir, workDir); err != nil {
		slog.Error("Failed to install launch agent", "error", err)
		os.Exit(1)
	}
}

func runLogs(logDir string) {
	if err := logger.TailLogs(logDir, os.Stdout); err != nil {
		fmt.Fprintf(os.Stderr, "Error tailing logs: %v\n", err)
		os.Exit(1)
	}
}

func runOpen(ctx context.Context, db *store.Queries) {
	// Handle graceful shutdown
	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, syscall.SIGINT, syscall.SIGTERM)

	server := web_ui.NewServer(db, "8080")

	// Start server in goroutine
	go func() {
		if err := server.Start(ctx); err != nil {
			slog.Error("Server error", "error", err)
			os.Exit(1)
		}
	}()

	// Wait for shutdown signal
	<-sigChan
	slog.Info("Shutting down web server")
}

func runUninstall() {
	fmt.Println("MacTimeTracker Uninstaller")
	fmt.Println("==========================")
	fmt.Println()
	fmt.Println("This will remove:")
	fmt.Println("  - App bundle (~/Applications/MacTimeTracker.app)")
	fmt.Println("  - LaunchAgent plist")
	fmt.Println()
	fmt.Print("Do you also want to remove your data (database and logs)? [y/N]: ")

	var response string
	fmt.Scanln(&response)

	removeData := false
	if response == "y" || response == "Y" || response == "yes" || response == "Yes" {
		removeData = true
	}

	fmt.Println()
	if err := daemon.UninstallLaunchAgent(removeData); err != nil {
		slog.Error("Failed to uninstall", "error", err)
		os.Exit(1)
	}
}
