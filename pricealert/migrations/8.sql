
-- Create snapshot queue for background processing
CREATE TABLE snapshot_queue (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id INTEGER NOT NULL,
  priority TEXT DEFAULT 'normal',
  status TEXT DEFAULT 'pending',
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 3,
  scheduled_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  started_at DATETIME,
  completed_at DATETIME,
  error_message TEXT,
  result_data TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create search logs for monitoring
CREATE TABLE search_provider_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  provider TEXT NOT NULL,
  query TEXT NOT NULL,
  results_count INTEGER DEFAULT 0,
  duration_ms INTEGER,
  success BOOLEAN DEFAULT FALSE,
  error_message TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create new indexes
CREATE INDEX IF NOT EXISTS idx_snapshot_queue_status ON snapshot_queue(status, scheduled_at);
CREATE INDEX IF NOT EXISTS idx_search_provider_logs_created ON search_provider_logs(created_at DESC);
