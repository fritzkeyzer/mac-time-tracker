//go:build darwin

#import "power_assertions_darwin.h"

int hasActivePowerAssertions() {
    CFDictionaryRef assertions = NULL;
    IOReturn result = IOPMCopyAssertionsByProcess(&assertions);

    if (result != kIOReturnSuccess || !assertions) {
        return 0;
    }

    int hasNoDisplaySleep = 0;

    // Iterate through all processes with assertions
    CFIndex count = CFDictionaryGetCount(assertions);
    if (count > 0) {
        CFTypeRef *keys = malloc(sizeof(CFTypeRef) * count);
        CFTypeRef *values = malloc(sizeof(CFTypeRef) * count);
        CFDictionaryGetKeysAndValues(assertions, keys, values);

        for (CFIndex i = 0; i < count; i++) {
            CFArrayRef processAssertions = (CFArrayRef)values[i];
            if (!processAssertions) continue;

            CFIndex assertionCount = CFArrayGetCount(processAssertions);
            for (CFIndex j = 0; j < assertionCount; j++) {
                CFDictionaryRef assertion = CFArrayGetValueAtIndex(processAssertions, j);
                if (!assertion) continue;

                CFStringRef type = CFDictionaryGetValue(assertion, kIOPMAssertionTypeKey);
                if (type && CFStringCompare(type, CFSTR("NoDisplaySleepAssertion"), 0) == kCFCompareEqualTo) {
                    hasNoDisplaySleep = 1;
                    break;
                }
            }

            if (hasNoDisplaySleep) break;
        }

        free(keys);
        free(values);
    }

    CFRelease(assertions);
    return hasNoDisplaySleep;
}

PowerAssertionList getPowerAssertions() {
    PowerAssertionList result = {NULL, 0};
    CFDictionaryRef assertions = NULL;
    IOReturn ioResult = IOPMCopyAssertionsByProcess(&assertions);

    if (ioResult != kIOReturnSuccess || !assertions) {
        return result;
    }

    // Count total assertions
    CFIndex processCount = CFDictionaryGetCount(assertions);
    int totalAssertions = 0;

    CFTypeRef *keys = malloc(sizeof(CFTypeRef) * processCount);
    CFTypeRef *values = malloc(sizeof(CFTypeRef) * processCount);
    CFDictionaryGetKeysAndValues(assertions, keys, values);

    for (CFIndex i = 0; i < processCount; i++) {
        CFArrayRef processAssertions = (CFArrayRef)values[i];
        if (processAssertions) {
            totalAssertions += CFArrayGetCount(processAssertions);
        }
    }

    if (totalAssertions == 0) {
        free(keys);
        free(values);
        CFRelease(assertions);
        return result;
    }

    // Allocate array
    PowerAssertionData* assertionData = malloc(sizeof(PowerAssertionData) * totalAssertions);
    int currentIndex = 0;

    // Iterate and populate
    for (CFIndex i = 0; i < processCount; i++) {
        CFNumberRef pidRef = (CFNumberRef)keys[i];
        int pid = 0;
        if (pidRef) {
            CFNumberGetValue(pidRef, kCFNumberIntType, &pid);
        }

        CFArrayRef processAssertions = (CFArrayRef)values[i];
        if (!processAssertions) continue;

        CFIndex assertionCount = CFArrayGetCount(processAssertions);
        for (CFIndex j = 0; j < assertionCount; j++) {
            CFDictionaryRef assertion = CFArrayGetValueAtIndex(processAssertions, j);
            if (!assertion) continue;

            // Get process name
            CFStringRef processNameRef = CFDictionaryGetValue(assertion, CFSTR("Process Name"));
            const char* processName = "Unknown";
            char processNameBuf[256] = {0};
            if (processNameRef) {
                const char* tmpName = CFStringGetCStringPtr(processNameRef, kCFStringEncodingUTF8);
                if (tmpName) {
                    processName = tmpName;
                } else {
                    CFStringGetCString(processNameRef, processNameBuf, sizeof(processNameBuf), kCFStringEncodingUTF8);
                    processName = processNameBuf;
                }
            }

            // Get assertion type
            CFStringRef typeRef = CFDictionaryGetValue(assertion, kIOPMAssertionTypeKey);
            const char* assertionType = "Unknown";
            char typeBuf[128] = {0};
            if (typeRef) {
                const char* tmpType = CFStringGetCStringPtr(typeRef, kCFStringEncodingUTF8);
                if (tmpType) {
                    assertionType = tmpType;
                } else {
                    CFStringGetCString(typeRef, typeBuf, sizeof(typeBuf), kCFStringEncodingUTF8);
                    assertionType = typeBuf;
                }
            }

            // Store data
            assertionData[currentIndex].processName = strdup(processName);
            assertionData[currentIndex].pid = pid;
            assertionData[currentIndex].assertionType = strdup(assertionType);
            currentIndex++;
        }
    }

    free(keys);
    free(values);
    CFRelease(assertions);

    result.assertions = assertionData;
    result.count = currentIndex;
    return result;
}

void freePowerAssertionList(PowerAssertionList list) {
    for (int i = 0; i < list.count; i++) {
        free(list.assertions[i].processName);
        free(list.assertions[i].assertionType);
    }
    free(list.assertions);
}
