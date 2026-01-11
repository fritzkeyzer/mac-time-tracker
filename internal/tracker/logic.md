# The Polling Logic (Every 10 Seconds)
```
1. Get current snapshot:
    - List of open windows + apps
    - Active (focused) window
    - Idle time

2. Check idle threshold (e.g., 5 minutes):
   IF idle_time > IDLE_THRESHOLD:
    - End all open spans (WHERE ended_at IS NULL)
      SET ended_at = last_seen_at
    - Start/update idle_period
    - SKIP rest of processing
   ELSE IF was_idle_before:
    - End idle_period

3. For each open app:
    - Find existing open span (WHERE app_name = X AND ended_at IS NULL)
    - IF exists:
      UPDATE last_seen_at = now()
      UPDATE sample_count += 1
      IF is_focused: UPDATE focus_count += 1
    - ELSE:
      INSERT new span with started_at = now()

4. For each open window:
    - Find existing open span (WHERE app_name = X AND title = Y AND ended_at IS NULL)
    - IF exists:
      UPDATE last_seen_at = now()
      UPDATE sample_count += 1
      IF is_focused: UPDATE focus_count += 1
    - ELSE:
      INSERT new span with started_at = now()

5. Close stale spans (sleep/crash recovery):
    - Find all open spans WHERE ended_at IS NULL AND last_seen_at < (now() - STALE_THRESHOLD)
    - SET ended_at = last_seen_at for these spans

   STALE_THRESHOLD should be 10 * POLL_INTERVAL
```
