-- Application-level spans (coarse-grained tracking)
CREATE TABLE app_spans
(
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    app_name     TEXT    NOT NULL,
    started_at   INTEGER NOT NULL,  -- Unix timestamp
    last_seen_at INTEGER NOT NULL,
    ended_at     INTEGER,
    focus_count  INTEGER DEFAULT 0, -- How many times this app was focused
    sample_count INTEGER DEFAULT 0  -- How many samples saw this app open
);

CREATE INDEX idx_app_time ON app_spans (app_name, started_at, ended_at);
CREATE INDEX idx_app_ended ON app_spans (ended_at);


-- Window-level spans (fine-grained tracking)
CREATE TABLE window_spans
(
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    app_name     TEXT    NOT NULL,
    window_title TEXT    NOT NULL,
    started_at   INTEGER NOT NULL,
    last_seen_at INTEGER NOT NULL,
    ended_at     INTEGER,
    focus_count  INTEGER DEFAULT 0,
    sample_count INTEGER DEFAULT 0
);

CREATE INDEX idx_window_time ON window_spans (app_name, started_at, ended_at);
CREATE INDEX idx_window_ended ON window_spans (ended_at);

-- Idle spans: Track idle periods explicitly
CREATE TABLE idle_periods
(
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    started_at INTEGER NOT NULL,
    ended_at   INTEGER
);

CREATE INDEX idx_idle_time on idle_periods (started_at, ended_at)