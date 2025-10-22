
-- Add new columns to products table for v1.0.3
ALTER TABLE products ADD COLUMN canonical_gtin TEXT;
ALTER TABLE products ADD COLUMN canonical_asin TEXT;
ALTER TABLE products ADD COLUMN canonical_mpn TEXT;
ALTER TABLE products ADD COLUMN model TEXT;
ALTER TABLE products ADD COLUMN last_source TEXT DEFAULT 'legacy';
ALTER TABLE products ADD COLUMN last_collected_at DATETIME;
ALTER TABLE products ADD COLUMN data_quality TEXT DEFAULT 'partial';

-- Add indexes for performance
CREATE INDEX idx_products_canonical_gtin ON products(canonical_gtin);
CREATE INDEX idx_products_canonical_asin ON products(canonical_asin);
CREATE INDEX idx_products_last_source ON products(last_source);
CREATE INDEX idx_products_data_quality ON products(data_quality);

-- Create scraping_logs table for monitoring
CREATE TABLE scraping_logs (
id INTEGER PRIMARY KEY AUTOINCREMENT,
url TEXT NOT NULL,
domain TEXT NOT NULL,
stage TEXT NOT NULL,
duration_ms INTEGER,
success BOOLEAN DEFAULT FALSE,
error_message TEXT,
created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_scraping_logs_domain ON scraping_logs(domain);
CREATE INDEX idx_scraping_logs_success ON scraping_logs(success);
CREATE INDEX idx_scraping_logs_created_at ON scraping_logs(created_at);
