
-- Remove new indexes
DROP INDEX IF EXISTS idx_search_provider_logs_created;
DROP INDEX IF EXISTS idx_snapshot_queue_status;

-- Remove new tables
DROP TABLE IF EXISTS search_provider_logs;
DROP TABLE IF EXISTS snapshot_queue;
