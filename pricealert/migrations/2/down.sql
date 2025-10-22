
-- Drop new indexes
DROP INDEX IF EXISTS idx_feedback_is_resolved;
DROP INDEX IF EXISTS idx_feedback_type;
DROP INDEX IF EXISTS idx_feedback_user_id;
DROP INDEX IF EXISTS idx_analytics_events_created_at;
DROP INDEX IF EXISTS idx_analytics_events_event_name;
DROP INDEX IF EXISTS idx_analytics_events_user_id;

-- Drop new tables
DROP TABLE IF EXISTS feedback;
DROP TABLE IF EXISTS analytics_events;
