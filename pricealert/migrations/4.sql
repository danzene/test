
-- Add indexes for new tables in v1.0.2
CREATE INDEX idx_alert_history_alert_id ON alert_history(alert_id);
CREATE INDEX idx_alert_history_user_id ON alert_history(user_id);
CREATE INDEX idx_alert_history_product_id ON alert_history(product_id);
CREATE INDEX idx_alert_history_sent_at ON alert_history(sent_at);

CREATE INDEX idx_user_preferences_user_id ON user_preferences(user_id);

CREATE INDEX idx_wishlists_user_id ON wishlists(user_id);
CREATE INDEX idx_wishlists_product_id ON wishlists(product_id);

CREATE INDEX idx_product_categories_slug ON product_categories(slug);

CREATE INDEX idx_product_category_mappings_product_id ON product_category_mappings(product_id);
CREATE INDEX idx_product_category_mappings_category_id ON product_category_mappings(category_id);

-- Add additional performance indexes for existing tables
CREATE INDEX idx_price_points_product_id_captured_at ON price_points(product_id, captured_at);
CREATE INDEX idx_price_points_price ON price_points(price);

CREATE INDEX idx_alerts_user_id_is_active ON alerts(user_id, is_active);
CREATE INDEX idx_alerts_product_id_is_active ON alerts(product_id, is_active);
CREATE INDEX idx_alerts_target_price ON alerts(target_price);

CREATE INDEX idx_products_brand ON products(brand);
CREATE INDEX idx_products_last_price ON products(last_price);
CREATE INDEX idx_products_created_at ON products(created_at);

CREATE INDEX idx_search_logs_user_id_created_at ON search_logs(user_id, created_at);
CREATE INDEX idx_search_logs_success ON search_logs(success);
