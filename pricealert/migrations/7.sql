
-- Create offer_items table for admin-managed offers
CREATE TABLE offer_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  store TEXT NOT NULL,
  domain TEXT NOT NULL,
  image_url TEXT,
  url TEXT NOT NULL,
  price REAL,
  currency TEXT DEFAULT 'BRL',
  drop_pct REAL,
  category TEXT,
  tags TEXT,
  active BOOLEAN DEFAULT TRUE,
  pinned BOOLEAN DEFAULT FALSE,
  expires_at DATETIME,
  created_by TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for offer_items
CREATE INDEX idx_offer_items_active ON offer_items(active);
CREATE INDEX idx_offer_items_pinned ON offer_items(pinned);
CREATE INDEX idx_offer_items_category ON offer_items(category);
CREATE INDEX idx_offer_items_domain ON offer_items(domain);
CREATE INDEX idx_offer_items_created_by ON offer_items(created_by);

-- Add reprocess_logs for tracking reprocessing attempts
CREATE TABLE reprocess_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT,
  product_id INTEGER NOT NULL,
  scope TEXT DEFAULT 'all',
  success BOOLEAN DEFAULT FALSE,
  duration_ms INTEGER,
  error_message TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_reprocess_logs_user_product ON reprocess_logs(user_id, product_id);
CREATE INDEX idx_reprocess_logs_created_at ON reprocess_logs(created_at);
