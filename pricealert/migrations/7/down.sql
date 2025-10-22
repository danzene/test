
-- Remove reprocess_logs indexes
DROP INDEX idx_reprocess_logs_user_product;
DROP INDEX idx_reprocess_logs_created_at;

-- Remove reprocess_logs table
DROP TABLE reprocess_logs;

-- Remove offer_items indexes
DROP INDEX idx_offer_items_active;
DROP INDEX idx_offer_items_pinned;
DROP INDEX idx_offer_items_category;
DROP INDEX idx_offer_items_domain;
DROP INDEX idx_offer_items_created_by;

-- Remove offer_items table
DROP TABLE offer_items;
