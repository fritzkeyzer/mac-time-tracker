//go:build darwin

#import <Foundation/Foundation.h>
#import <IOKit/pwr_mgt/IOPMLib.h>

typedef struct {
    char* processName;
    int pid;
    char* assertionType;
} PowerAssertionData;

typedef struct {
    PowerAssertionData* assertions;
    int count;
} PowerAssertionList;

// Returns 1 if NoDisplaySleep assertions exist, 0 otherwise
int hasActivePowerAssertions();

// Returns detailed list of all power assertions
PowerAssertionList getPowerAssertions();

// Free memory allocated for assertion list
void freePowerAssertionList(PowerAssertionList list);
