CREATE TABLE IF NOT EXISTS analytics_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  visitor_hash TEXT NOT NULL,
  session_id TEXT NOT NULL,
  event_type TEXT NOT NULL DEFAULT 'pageview',
  event_name TEXT,
  pathname TEXT NOT NULL,
  hostname TEXT NOT NULL,
  referrer TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  device_type TEXT,
  browser TEXT,
  os TEXT,
  country TEXT,
  screen_width INTEGER,
  props TEXT,
  entry_page INTEGER DEFAULT 0,
  duration INTEGER DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_events_created_at ON analytics_events(created_at);
CREATE INDEX IF NOT EXISTS idx_events_visitor_session ON analytics_events(visitor_hash, created_at);
CREATE INDEX IF NOT EXISTS idx_events_session ON analytics_events(session_id);
CREATE INDEX IF NOT EXISTS idx_events_pathname ON analytics_events(pathname, created_at);
CREATE INDEX IF NOT EXISTS idx_events_event_type ON analytics_events(event_type, created_at);
CREATE INDEX IF NOT EXISTS idx_events_composite ON analytics_events(created_at, event_type, pathname);
