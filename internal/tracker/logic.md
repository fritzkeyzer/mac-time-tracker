# Tracker Logic

This function is responsible for polling the user's active environment and synchronizing that state with a database. It
ensures that continuous activity is recorded as a single "span" of time, while interruptions or context switches create
new spans.

### 1. Environment & Activity Checks (Early Exits)

Before interacting with the database, the function validates the current user state to ensure data is worth recording.

* **Idle Check:** It queries the system idle time.
* > **Condition:** If `idleSeconds` > `idleThreshold`...
* **Action:** It logs "Idle" and returns immediately (stops tracking).
* **Window Acquisition:** It retrieves the list of currently open windows.
* If no windows are found, it logs a warning (potential permission issue) and returns.
* **Active Window Resolution:** It iterates through the window list to find the specific window where
  `IsActive == true`.
* It extracts the `AppName` and `WindowTitle`.
* If either is missing, it logs a warning and returns.

---

### 2. Database Synchronization (Span Logic)

Once a valid, active window is identified, the function reconciles this with the latest record in the database (
`s.Queries.SelectLatestSpan`).

The logic follows this decision tree:

| Previous Span Exists? | Same App/Window?        | Time Gap > Stale Threshold? | **Action Taken**                         |
|-----------------------|-------------------------|-----------------------------|------------------------------------------|
| **No**                | N/A                     | N/A                         | **Create New Span** (Insert)             |
| **Yes**               | **Yes**                 | **No** (Continuous)         | **Extend Current Span** (Update `EndAt`) |
| **Yes**               | **No** (Context Switch) | *Irrelevant*                | **Create New Span** (Insert)             |
| **Yes**               | *Irrelevant*            | **Yes** (Gap too long)      | **Create New Span** (Insert)             |

#### Detailed Logic Breakdown

* **Case A: No History (Cold Start)**
  If `sql.ErrNoRows` is returned, no previous activity exists. A **new span** is inserted with the current time as both
  the start and end.
* **Case B: History Exists**
  If a previous span is found, the function calculates two boolean states:

1. `spanMatch`: Does the DB's App Name and Window Title match the currently active one?
2. `spanStale`: Is `Time.Now - Last.EndAt` greater than the `staleThreshold`?


* **If `spanMatch` AND `!spanStale`:**
  The user is continuing the exact same task without a significant break. The function **updates** the existing record,
  pushing the `EndAt` timestamp to now.
* **If `!spanMatch` OR `spanStale`:**
  The user either switched apps OR walked away long enough for the session to be considered "stale" (even if the app is
  the same). The function **inserts a new span** to start a fresh tracking block.

---

### Key Variables

* **`idleThreshold`:** How long the user must be inactive (mouse/keyboard) before the tracker stops recording entirely.
* **`staleThreshold`:** The maximum allowed gap between polling intervals before a continuous session is broken into a
  new separate entry (e.g., if the computer slept or the poller crashed).
