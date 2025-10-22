-- Manual migration for enhanced product fields
-- These need to be run manually due to SQLite limitations with ALTER TABLE

-- Add columns for enhanced product identity (run these manually if needed)
-- ALTER TABLE products ADD COLUMN canonical_brand TEXT;
-- ALTER TABLE products ADD COLUMN canonical_model TEXT;
-- ALTER TABLE products ADD COLUMN image_hash TEXT;
-- ALTER TABLE products ADD COLUMN verified BOOLEAN DEFAULT FALSE;

-- Add columns for enhanced market prices (run these manually if needed)  
-- ALTER TABLE market_prices ADD COLUMN confidence REAL DEFAULT 1.0;
-- ALTER TABLE market_prices ADD COLUMN data_quality TEXT DEFAULT 'verified';
-- ALTER TABLE market_prices ADD COLUMN last_checked_at DATETIME DEFAULT CURRENT_TIMESTAMP;

-- Add indexes for canonical fields (run these manually if needed)
-- CREATE INDEX IF NOT EXISTS idx_products_canonical ON products(canonical_gtin, canonical_asin, canonical_brand, canonical_model);
