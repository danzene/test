
-- Remove indexes
DROP INDEX IF EXISTS idx_market_prices_product_domain;
DROP INDEX IF EXISTS idx_products_brand_model;
DROP INDEX IF EXISTS idx_products_canonical_asin;
DROP INDEX IF EXISTS idx_products_canonical_gtin;

-- Remove columns
ALTER TABLE market_prices DROP COLUMN confidence;
ALTER TABLE products DROP COLUMN verified;
ALTER TABLE products DROP COLUMN canonical_brand;
