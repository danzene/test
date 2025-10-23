import z from "zod";

// Enums
export const PlanEnum = z.enum(['FREE', 'GOLD', 'PREMIUM']);
export type Plan = z.infer<typeof PlanEnum>;

export const ChannelEnum = z.enum(['email', 'whatsapp']);
export type Channel = z.infer<typeof ChannelEnum>;

// Schemas
export const ProductSchema = z.object({
  id: z.number(),
  source_url: z.string().url(),
  domain: z.string(),
  title: z.string(),
  brand: z.string().nullable(),
  sku: z.string().nullable(),
  image_url: z.string().url().nullable(),
  last_price: z.number().nullable(),
  currency: z.string().default('BRL'),
  embedding: z.string().nullable(),
  canonical_gtin: z.string().nullable(),
  canonical_asin: z.string().nullable(),
  canonical_mpn: z.string().nullable(),
  model: z.string().nullable(),
  last_source: z.string().default('legacy'),
  last_collected_at: z.string().nullable(),
  data_quality: z.enum(['verified', 'partial']).default('partial'),
  created_at: z.string(),
  updated_at: z.string(),
});

export const PricePointSchema = z.object({
  id: z.number(),
  product_id: z.number(),
  price: z.number(),
  currency: z.string().default('BRL'),
  captured_at: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
});

export const AlertSchema = z.object({
  id: z.number(),
  user_id: z.string(),
  product_id: z.number(),
  target_price: z.number(),
  channels: z.string(), // JSON array of channels
  is_active: z.boolean(),
  last_sent_at: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});

export const ProductMatchSchema = z.object({
  id: z.number(),
  product_id: z.number(),
  matched_product_id: z.number(),
  confidence: z.number(),
  created_at: z.string(),
  updated_at: z.string(),
});

export const UserSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  plan: PlanEnum,
  role: z.enum(['USER', 'ADMIN']).default('USER'),
  phone_e164: z.string().nullable(),
  wa_opt_in: z.boolean(),
  created_at: z.string(),
  updated_at: z.string(),
});

// New schemas for v1.0.4
export const MarketPriceSchema = z.object({
  id: z.number(),
  product_id: z.number(),
  domain: z.string(),
  url: z.string(),
  price: z.number(),
  currency: z.string().default('BRL'),
  collected_at: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
});

export const PriceStats90dSchema = z.object({
  min: z.number().nullable(),
  max: z.number().nullable(),
  avg: z.number().nullable(),
  changePct: z.number(),
});

export const MarketSnapshotStatsSchema = z.object({
  min: z.number().nullable(),
  max: z.number().nullable(),
  avg: z.number().nullable(),
  stores: z.number(),
});

export const MarketSnapshotResponseSchema = z.object({
  items: z.array(z.object({
    domain: z.string(),
    url: z.string(),
    price: z.number(),
    currency: z.string(),
    confidence: z.number(),
    collected_at: z.string(),
  })),
  snapshotStats: MarketSnapshotStatsSchema,
  verified: z.boolean(),
  disabled: z.boolean().optional(),
  partial: z.boolean().optional(),
});

export const ReprocessRequestSchema = z.object({
  productId: z.number(),
  scope: z.enum(['all', 'price', 'market']).optional().default('all'),
});

// API Request/Response types
export const IngestRequestSchema = z.object({
  url: z.string().url(),
});

export const IngestResponseSchema = z.object({
  ok: z.boolean(),
  productId: z.number(),
  title: z.string().optional(),
  imageUrl: z.string().url().nullable().optional(),
  price: z.number().nullable().optional(),
  domain: z.string().optional(),
  error: z.string().optional(),
});

export const CreateAlertRequestSchema = z.object({
  productId: z.number(),
  targetPrice: z.number(),
  channels: z.array(ChannelEnum),
});

export const ProductDetailsResponseSchema = z.object({
  product: ProductSchema,
  pricePoints: z.array(PricePointSchema),
  matches: z.array(ProductSchema),
  userAlert: AlertSchema.nullable(),
});

export const UserLimitsResponseSchema = z.object({
  plan: PlanEnum,
  limits: z.object({
    maxMonitoredItems: z.number(),
    maxSearchesPerDay: z.number(),
    canUseWhatsApp: z.boolean(),
    priorityQueue: z.boolean(),
  }),
  usage: z.object({
    monitoredItems: z.number(),
    searchesToday: z.number(),
  }),
});

// Derived types
export type Product = z.infer<typeof ProductSchema>;
export type PricePoint = z.infer<typeof PricePointSchema>;
export type Alert = z.infer<typeof AlertSchema>;
export type ProductMatch = z.infer<typeof ProductMatchSchema>;
export type User = z.infer<typeof UserSchema>;
export type MarketPrice = z.infer<typeof MarketPriceSchema>;
export type PriceStats90d = z.infer<typeof PriceStats90dSchema>;
export type MarketSnapshotStats = z.infer<typeof MarketSnapshotStatsSchema>;
export type MarketSnapshotResponse = z.infer<typeof MarketSnapshotResponseSchema>;
export type IngestRequest = z.infer<typeof IngestRequestSchema>;
export type IngestResponse = z.infer<typeof IngestResponseSchema>;
export type CreateAlertRequest = z.infer<typeof CreateAlertRequestSchema>;
export type ProductDetailsResponse = z.infer<typeof ProductDetailsResponseSchema>;
export type UserLimitsResponse = z.infer<typeof UserLimitsResponseSchema>;

// New schemas for v1.0.2
export const AlertHistorySchema = z.object({
  id: z.number(),
  alert_id: z.number(),
  user_id: z.string(),
  product_id: z.number(),
  target_price: z.number(),
  actual_price: z.number(),
  channels: z.string(),
  notification_sent: z.boolean(),
  sent_at: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});

export const UserPreferencesSchema = z.object({
  id: z.number(),
  user_id: z.string(),
  email_notifications: z.boolean(),
  whatsapp_notifications: z.boolean(),
  price_drop_threshold: z.number(),
  notification_frequency: z.string(),
  timezone: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
});

export const WishlistSchema = z.object({
  id: z.number(),
  user_id: z.string(),
  product_id: z.number(),
  notes: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});

export const ProductCategorySchema = z.object({
  id: z.number(),
  name: z.string(),
  slug: z.string(),
  description: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});

export const ProductCategoryMappingSchema = z.object({
  id: z.number(),
  product_id: z.number(),
  category_id: z.number(),
  confidence: z.number(),
  created_at: z.string(),
  updated_at: z.string(),
});

// Extended schemas for dashboard with joined data
export const DashboardAlertSchema = AlertSchema.extend({
  title: z.string(),
  image_url: z.string().nullable(),
  last_price: z.number().nullable(),
  domain: z.string(),
});

export const DashboardAlertHistorySchema = AlertHistorySchema.extend({
  title: z.string(),
  image_url: z.string().nullable(),
  domain: z.string(),
});

export const DashboardResponseSchema = z.object({
  alerts: z.array(DashboardAlertSchema),
  alertHistory: z.array(DashboardAlertHistorySchema),
  wishlistCount: z.number(),
});

export const WishlistResponseSchema = z.object({
  items: z.array(ProductSchema.extend({
    wishlist_notes: z.string().nullable(),
    wishlist_added_at: z.string(),
  })),
});

export const UpdatePreferencesRequestSchema = z.object({
  email_notifications: z.boolean().optional(),
  whatsapp_notifications: z.boolean().optional(),
  price_drop_threshold: z.number().min(0).max(1).optional(),
  notification_frequency: z.enum(['immediate', 'daily', 'weekly']).optional(),
  timezone: z.string().optional(),
});

// New schemas for v1.0.3
export const CanonicalIdsSchema = z.object({
  gtin: z.string().nullable(),
  asin: z.string().nullable(),
  mpn: z.string().nullable(),
  brand: z.string().nullable(),
  model: z.string().nullable(),
});

export const ProductRawSchema = z.object({
  title: z.string(),
  price: z.number().nullable(),
  currency: z.string().default('BRL'),
  image_url: z.string().nullable(),
  brand: z.string().nullable(),
  sku: z.string().nullable(),
  gtin: z.string().nullable(),
  asin: z.string().nullable(),
  mpn: z.string().nullable(),
  model: z.string().nullable(),
  specifications: z.record(z.string()).optional(),
  canonical: CanonicalIdsSchema,
  quality: z.enum(['verified', 'partial']),
});

export const ScrapingResultSchema = z.object({
  product: ProductRawSchema,
  canonical: CanonicalIdsSchema,
  source: z.enum(['adapter', 'universal']),
  dataQuality: z.enum(['verified', 'partial']),
  collectedAt: z.string(),
});

export const OfferResolvedSchema = z.object({
  productId: z.number(),
  title: z.string(),
  price: z.number().nullable(),
  currency: z.string(),
  domain: z.string(),
  sourceUrl: z.string(),
  imageUrl: z.string().nullable(),
  confidence: z.number(),
});

// Enhanced IngestResponse for v1.0.3
export const EnhancedIngestResponseSchema = z.object({
  productId: z.number(),
  title: z.string(),
  imageUrl: z.string().nullable(),
  price: z.number().nullable(),
  currency: z.string(),
  domain: z.string(),
  collectedAt: z.string(),
  source: z.enum(['adapter', 'universal']),
  canonical: CanonicalIdsSchema,
  dataQuality: z.enum(['verified', 'partial']),
});

// Enhanced ProductDetails for v1.0.6.1
export const EnhancedProductDetailsResponseSchema = z.object({
  ok: z.boolean(),
  product: ProductSchema,
  pricePoints: z.array(z.object({
    date: z.string(),
    price: z.number(),
  })),
  matches: z.array(OfferResolvedSchema),
  userAlert: AlertSchema.nullable(),
  collectedFrom: z.string(),
  collectedAt: z.string().nullable(),
  source: z.string(),
  dataQuality: z.enum(['verified', 'partial']),
  stats90d: PriceStats90dSchema,
  verified: z.boolean(),
  collecting: z.boolean(),
});

// Admin Offer Item schema
export const OfferItemSchema = z.object({
  id: z.string(),
  title: z.string(),
  store: z.string(),
  domain: z.string(),
  image_url: z.string().nullable(),
  url: z.string(),
  price: z.number().nullable(),
  currency: z.string().default('BRL'),
  drop_pct: z.number().nullable(),
  category: z.string().nullable(),
  tags: z.array(z.string()),
  active: z.boolean(),
  pinned: z.boolean(),
  expires_at: z.string().nullable(),
  created_by: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
});

export const CreateOfferItemRequestSchema = z.object({
  title: z.string().min(1),
  store: z.string().min(1),
  domain: z.string(),
  image_url: z.string().url().nullable().optional(),
  url: z.string().url(),
  price: z.number().positive().nullable().optional(),
  currency: z.string().default('BRL'),
  drop_pct: z.number().min(0).max(100).nullable().optional(),
  category: z.string().nullable().optional(),
  tags: z.array(z.string()).optional(),
  active: z.boolean().default(true),
  pinned: z.boolean().default(false),
  expires_at: z.string().nullable().optional(),
});

export const UpdateOfferItemRequestSchema = CreateOfferItemRequestSchema.partial();

export const AdminStatsResponseSchema = z.object({
  totalOffers: z.number(),
  activeOffers: z.number(),
  totalUsers: z.number(),
  todaySignups: z.number(),
  totalRevenue: z.number(),
  monthlyRevenue: z.number(),
  totalPageViews: z.number(),
  todayPageViews: z.number(),
});

// New derived types
export type CanonicalIds = z.infer<typeof CanonicalIdsSchema>;
export type ProductRaw = z.infer<typeof ProductRawSchema>;
export type ScrapingResult = z.infer<typeof ScrapingResultSchema>;
export type OfferResolved = z.infer<typeof OfferResolvedSchema>;
export type ReprocessRequest = z.infer<typeof ReprocessRequestSchema>;
export type EnhancedIngestResponse = z.infer<typeof EnhancedIngestResponseSchema>;
export type EnhancedProductDetailsResponse = z.infer<typeof EnhancedProductDetailsResponseSchema>;
export type AlertHistory = z.infer<typeof AlertHistorySchema>;
export type UserPreferences = z.infer<typeof UserPreferencesSchema>;
export type Wishlist = z.infer<typeof WishlistSchema>;
export type ProductCategory = z.infer<typeof ProductCategorySchema>;
export type ProductCategoryMapping = z.infer<typeof ProductCategoryMappingSchema>;
export type DashboardAlert = z.infer<typeof DashboardAlertSchema>;
export type DashboardAlertHistory = z.infer<typeof DashboardAlertHistorySchema>;
export type DashboardResponse = z.infer<typeof DashboardResponseSchema>;
export type WishlistResponse = z.infer<typeof WishlistResponseSchema>;
export type UpdatePreferencesRequest = z.infer<typeof UpdatePreferencesRequestSchema>;
export type OfferItem = z.infer<typeof OfferItemSchema>;
export type CreateOfferItemRequest = z.infer<typeof CreateOfferItemRequestSchema>;
export type UpdateOfferItemRequest = z.infer<typeof UpdateOfferItemRequestSchema>;
export type AdminStatsResponse = z.infer<typeof AdminStatsResponseSchema>;

// Plan limits configuration
export const PLAN_LIMITS = {
  FREE: {
    maxMonitoredItems: 1,
    maxSearchesPerDay: 2,
    maxWishlistItems: 5,
    canUseWhatsApp: false,
    priorityQueue: false,
    alertHistory: 7, // days
  },
  GOLD: {
    maxMonitoredItems: 15,
    maxSearchesPerDay: 50,
    maxWishlistItems: 50,
    canUseWhatsApp: true,
    priorityQueue: false,
    alertHistory: 30, // days
  },
  PREMIUM: {
    maxMonitoredItems: 100,
    maxSearchesPerDay: 500,
    maxWishlistItems: 500,
    canUseWhatsApp: true,
    priorityQueue: true,
    alertHistory: 365, // days
  },
} as const;

// AI Search response type
export const AISearchResponseSchema = z.object({
  items: z.array(OfferResolvedSchema),
  disabled: z.boolean().optional(),
  partial: z.boolean().optional(),
  method: z.enum(['ai', 'serp', 'fallback', 'cache', 'none']).optional(),
});

export type AISearchResponse = z.infer<typeof AISearchResponseSchema>;

// New v2.0 - Product Search Types
export const ProductSearchRequestSchema = z.object({
  query: z.string().min(2).max(200),
  maxResults: z.number().min(1).max(10).default(5),
});

export const ProductSearchResultSchema = z.object({
  title: z.string(),
  price: z.number().positive(),
  currency: z.string().default('BRL'),
  domain: z.string(),
  url: z.string().url(),
  imageUrl: z.string().url().nullable(),
  confidence: z.number().min(0).max(1),
});

export const SearchProductsResponseSchema = z.object({
  ok: z.boolean(),
  query: z.string(),
  results: z.array(ProductSearchResultSchema),
  totalFound: z.number(),
  searchMethod: z.enum(['ai', 'serp', 'fallback', 'none']),
  error: z.string().optional(),
});

export type ProductSearchRequest = z.infer<typeof ProductSearchRequestSchema>;
export type ProductSearchResult = z.infer<typeof ProductSearchResultSchema>;
export type SearchProductsResponse = z.infer<typeof SearchProductsResponseSchema>;
