ALTER TABLE analytics_events ADD COLUMN region TEXT;
ALTER TABLE analytics_events ADD COLUMN city TEXT;
ALTER TABLE analytics_events ADD COLUMN latitude REAL;
ALTER TABLE analytics_events ADD COLUMN longitude REAL;
