
CREATE TABLE market_prices (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id INTEGER NOT NULL,
  domain TEXT NOT NULL,
  url TEXT NOT NULL,
  price REAL NOT NULL,
  currency TEXT DEFAULT 'BRL',
  collected_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_market_prices_product_domain ON market_prices(product_id, domain);
CREATE INDEX idx_market_prices_collected_at ON market_prices(collected_at);
