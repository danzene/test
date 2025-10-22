
-- Performance indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_products_source_url ON products(source_url);
CREATE INDEX IF NOT EXISTS idx_products_gtin ON products(canonical_gtin);
CREATE INDEX IF NOT EXISTS idx_products_asin ON products(canonical_asin);
CREATE INDEX IF NOT EXISTS idx_price_points_product_captured ON price_points(product_id, captured_at);
CREATE INDEX IF NOT EXISTS idx_alerts_user_active ON alerts(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_market_prices_product_domain ON market_prices(product_id, domain);
