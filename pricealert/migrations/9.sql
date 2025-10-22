
-- Hotfix v1.0.7: Add missing canonical fields and fix column names
ALTER TABLE products ADD COLUMN canonical_brand TEXT;
ALTER TABLE products ADD COLUMN verified BOOLEAN DEFAULT FALSE;

-- Add market_prices confidence column if not exists
ALTER TABLE market_prices ADD COLUMN confidence REAL DEFAULT 1.0;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_products_canonical_gtin ON products(canonical_gtin);
CREATE INDEX IF NOT EXISTS idx_products_canonical_asin ON products(canonical_asin);
CREATE INDEX IF NOT EXISTS idx_products_brand_model ON products(canonical_brand, model);
CREATE INDEX IF NOT EXISTS idx_market_prices_product_domain ON market_prices(product_id, domain);
