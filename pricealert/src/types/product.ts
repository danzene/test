export type BRLCurrency = "BRL";

export type CanonicalIds = {
  gtin?: string | null;
  asin?: string | null;
  mpn?: string | null;
  brand?: string | null;
  model?: string | null;
};

export type ProductRaw = {
  url: string;
  domain: string;
  title: string;
  imageUrl: string | null;
  image_url?: string | null; // Legacy alias for compatibility
  price: number | null;     // preço à vista (buybox) ou null se indisponível
  currency: BRLCurrency;    // sempre "BRL"
  canonical: CanonicalIds;  // IDs canônicos e marca/modelo
  quality: "verified" | "partial";
  sku?: string | null;      // SKU if available
};

export type MarketItem = {
  domain: string;
  url: string;
  price: number;
  currency: BRLCurrency;
  confidence: number;       // 0..1
  collectedAt: string;      // ISO
};
