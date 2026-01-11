# Mac Time Tracker

A lightweight background daemon for macOS that automatically tracks application and window usage.

## Overview

Mac Time Tracker runs as a LaunchAgent in the background, periodically recording which applications and windows you're actively using. 
All data is stored locally in a SQLite database in your home directory (`~/.mac-time-tracker`).

Features:
- Automatic tracking of active windows and applications
- Idle detection (ignores periods of inactivity)
- Runs automatically at login via LaunchAgent
- Local storage with SQLite
- JSON structured logs

## Installation

### Prerequisites

- macOS
- Go 1.25 or later

### Install & Initialize

```bash
go install github.com/fritzkeyzer/mac-time-tracker/cmd/mac-time-tracker@latest

# After installing, run the init command to set up the LaunchAgent:
mac-time-tracker init
```

> Note! You will need to grant permissions to MacTimeTracker
> System settings > Privacy & Security > Screen & System Audio Recording
> You may need to click the + button and manually add the app

This will:
- Create the necessary directories (`~/.mac-time-tracker`)
- Install the LaunchAgent plist
- Start the daemon

The tracker will now run automatically in the background.

### Other Commands

```bash
# View logs (live stream)
mac-time-tracker logs

# Uninstall
mac-time-tracker uninstall
```

## Developing

### Build and re-initialize

```bash
go install ./cmd/mac-time-tracker && mac-time-tracker init
```

> Note! You will need to remove the application from the permissions list and manually re-add it

### Project structure

```
cmd/
  mac-time-tracker/    - Main entry point
internal/
  daemon/              - LaunchAgent installation/management
  logger/              - Logging utilities
  store/               - SQLite storage
  tracker/             - Window/app tracking logic
```

### Database location

`~/.mac-time-tracker/tracker.sqlite`

### Logs location

`~/.mac-time-tracker/logs/`
