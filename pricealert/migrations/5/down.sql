
-- Remove indexes first
DROP INDEX idx_scraping_logs_created_at;
DROP INDEX idx_scraping_logs_success;
DROP INDEX idx_scraping_logs_domain;
DROP INDEX idx_products_data_quality;
DROP INDEX idx_products_last_source;
DROP INDEX idx_products_canonical_asin;
DROP INDEX idx_products_canonical_gtin;

-- Drop new table
DROP TABLE scraping_logs;

-- Remove new columns from products
ALTER TABLE products DROP COLUMN data_quality;
ALTER TABLE products DROP COLUMN last_collected_at;
ALTER TABLE products DROP COLUMN last_source;
ALTER TABLE products DROP COLUMN model;
ALTER TABLE products DROP COLUMN canonical_mpn;
ALTER TABLE products DROP COLUMN canonical_asin;
ALTER TABLE products DROP COLUMN canonical_gtin;
