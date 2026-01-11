//go:build darwin

#import <Cocoa/Cocoa.h>
#import <CoreGraphics/CoreGraphics.h>
#import <ApplicationServices/ApplicationServices.h>

typedef struct {
    char* appName;
    char* windowTitle;
    int isActive;
    int pid;
} WindowData;

typedef struct {
    WindowData* windows;
    int count;
} WindowList;

// Get the focused window title from the frontmost application using Accessibility API
char* getFocusedWindowTitle(pid_t pid);

// Get list of all windows
WindowList getWindowList();

// Free window list memory
void freeWindowList(WindowList list);

// Check if we have Accessibility permission
int hasAccessibilityPermission();

// Check if we have Screen Recording permission
int hasScreenRecordingPermission();
