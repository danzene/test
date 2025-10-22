import { ProductRaw, MarketItem } from '@/types/product';

// Simple in-memory cache with TTL
class SimpleCache {
  private store = new Map<string, { value: any; expires: number }>();
  
  set(key: string, value: any, ttlMs: number) {
    this.store.set(key, {
      value,
      expires: Date.now() + ttlMs
    });
  }
  
  get<T>(key: string): T | null {
    const item = this.store.get(key);
    if (!item) return null;
    
    if (Date.now() > item.expires) {
      this.store.delete(key);
      return null;
    }
    
    return item.value as T;
  }
  
  delete(key: string) {
    this.store.delete(key);
  }
  
  clear() {
    this.store.clear();
  }
  
  // Cleanup expired entries
  cleanup() {
    const now = Date.now();
    for (const [key, item] of this.store.entries()) {
      if (now > item.expires) {
        this.store.delete(key);
      }
    }
  }
}

// Global cache instance
export const cache = new SimpleCache();

// Cleanup every 5 minutes
setInterval(() => cache.cleanup(), 5 * 60 * 1000);

// Cache keys and TTLs
export const CACHE_KEYS = {
  productRaw: (url: string) => `raw:${url}`,
  marketSnapshot: (canonical: string) => `market:${canonical}`,
  htmlContent: (url: string) => `html:${url}`,
} as const;

export const CACHE_TTL = {
  PRODUCT_RAW: 24 * 60 * 60 * 1000, // 24 hours
  MARKET_SNAPSHOT: 60 * 60 * 1000,  // 1 hour  
  HTML_CONTENT: 60 * 60 * 1000,     // 1 hour
} as const;

// Cache helpers
export function getCachedProductRaw(url: string): ProductRaw | null {
  return cache.get<ProductRaw>(CACHE_KEYS.productRaw(url));
}

export function setCachedProductRaw(url: string, data: ProductRaw) {
  cache.set(CACHE_KEYS.productRaw(url), data, CACHE_TTL.PRODUCT_RAW);
}

export function getCachedMarketSnapshot(canonical: string): MarketItem[] | null {
  return cache.get<MarketItem[]>(CACHE_KEYS.marketSnapshot(canonical));
}

export function setCachedMarketSnapshot(canonical: string, data: MarketItem[]) {
  cache.set(CACHE_KEYS.marketSnapshot(canonical), data, CACHE_TTL.MARKET_SNAPSHOT);
}
