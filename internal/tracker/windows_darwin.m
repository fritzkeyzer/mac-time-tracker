//go:build darwin

#import "windows_darwin.h"

// Get the focused window title from the frontmost application using Accessibility API
char* getFocusedWindowTitle(pid_t pid) {
    AXUIElementRef app = AXUIElementCreateApplication(pid);
    if (!app) return NULL;

    AXUIElementRef focusedWindow = NULL;
    AXError error = AXUIElementCopyAttributeValue(app, kAXFocusedWindowAttribute, (CFTypeRef*)&focusedWindow);

    if (error != kAXErrorSuccess || !focusedWindow) {
        CFRelease(app);
        return NULL;
    }

    CFStringRef title = NULL;
    error = AXUIElementCopyAttributeValue(focusedWindow, kAXTitleAttribute, (CFTypeRef*)&title);

    char* result = NULL;
    if (error == kAXErrorSuccess && title) {
        const char* titleStr = CFStringGetCStringPtr(title, kCFStringEncodingUTF8);
        char titleBuf[512] = {0};
        if (!titleStr) {
            CFStringGetCString(title, titleBuf, sizeof(titleBuf), kCFStringEncodingUTF8);
            titleStr = titleBuf;
        }
        result = strdup(titleStr);
        CFRelease(title);
    }

    CFRelease(focusedWindow);
    CFRelease(app);
    return result;
}

WindowList getWindowList() {
    WindowList result = {NULL, 0};

    // Get list of all windows (ordered front to back)
    CFArrayRef windowList = CGWindowListCopyWindowInfo(
        kCGWindowListOptionOnScreenOnly | kCGWindowListExcludeDesktopElements,
        kCGNullWindowID
    );

    if (!windowList) {
        return result;
    }

    CFIndex windowCount = CFArrayGetCount(windowList);

    // Allocate array for results
    WindowData* windows = malloc(sizeof(WindowData) * windowCount);
    int validCount = 0;
    int foundActiveWindow = 0;

    // Windows are returned in front-to-back order by CGWindowListCopyWindowInfo
    // The first window with layer 0 and a title is the active/focused window
    for (CFIndex i = 0; i < windowCount; i++) {
        CFDictionaryRef window = CFArrayGetValueAtIndex(windowList, i);

        // Get window layer - only include normal windows (layer 0)
        CFNumberRef layerRef = CFDictionaryGetValue(window, kCGWindowLayer);
        int layer = 0;
        if (layerRef) {
            CFNumberGetValue(layerRef, kCFNumberIntType, &layer);
        }

        // Get PID
        CFNumberRef pidRef = CFDictionaryGetValue(window, kCGWindowOwnerPID);
        if (!pidRef) continue;

        pid_t pid = 0;
        CFNumberGetValue(pidRef, kCFNumberIntType, &pid);

        // Get app name
        CFStringRef ownerNameRef = CFDictionaryGetValue(window, kCGWindowOwnerName);
        if (!ownerNameRef) continue;

        const char* ownerName = CFStringGetCStringPtr(ownerNameRef, kCFStringEncodingUTF8);
        char ownerNameBuf[256] = {0};
        if (!ownerName) {
            CFStringGetCString(ownerNameRef, ownerNameBuf, sizeof(ownerNameBuf), kCFStringEncodingUTF8);
            ownerName = ownerNameBuf;
        }

        // Get window title
        CFStringRef windowNameRef = CFDictionaryGetValue(window, kCGWindowName);
        const char* windowName = "";
        char windowNameBuf[512] = {0};

        if (windowNameRef) {
            const char* tmpName = CFStringGetCStringPtr(windowNameRef, kCFStringEncodingUTF8);
            if (tmpName) {
                windowName = tmpName;
            } else {
                CFStringGetCString(windowNameRef, windowNameBuf, sizeof(windowNameBuf), kCFStringEncodingUTF8);
                windowName = windowNameBuf;
            }
        }

        if (layer != 0) continue;

        // Skip windows without names (usually background windows)
        if (strlen(windowName) == 0) continue;

        // Mark the first valid window as active (windows are ordered front-to-back)
        int isActive = 0;
        if (!foundActiveWindow) {
            isActive = 1;
            foundActiveWindow = 1;
        }

        // Store the data
        windows[validCount].appName = strdup(ownerName);
        windows[validCount].windowTitle = strdup(windowName);
        windows[validCount].isActive = isActive;
        windows[validCount].pid = pid;
        validCount++;
    }

    CFRelease(windowList);

    result.windows = windows;
    result.count = validCount;

    return result;
}

void freeWindowList(WindowList list) {
    for (int i = 0; i < list.count; i++) {
        free(list.windows[i].appName);
        free(list.windows[i].windowTitle);
    }
    free(list.windows);
}

// Check if we have Accessibility permission
int hasAccessibilityPermission() {
    return AXIsProcessTrusted() ? 1 : 0;
}

// Check if we have Screen Recording permission
// This is approximate - we check if we can get window names from CGWindowListCopyWindowInfo
int hasScreenRecordingPermission() {
    CFArrayRef windowList = CGWindowListCopyWindowInfo(
        kCGWindowListOptionOnScreenOnly | kCGWindowListExcludeDesktopElements,
        kCGNullWindowID
    );

    if (!windowList) {
        return 0;
    }

    CFIndex windowCount = CFArrayGetCount(windowList);
    int hasPermission = 0;

    // Check if any window has a name - if Screen Recording is denied, all names will be empty
    for (CFIndex i = 0; i < windowCount && !hasPermission; i++) {
        CFDictionaryRef window = CFArrayGetValueAtIndex(windowList, i);
        CFStringRef windowNameRef = CFDictionaryGetValue(window, kCGWindowName);

        if (windowNameRef) {
            CFIndex length = CFStringGetLength(windowNameRef);
            if (length > 0) {
                hasPermission = 1;
            }
        }
    }

    CFRelease(windowList);
    return hasPermission;
}
