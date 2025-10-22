import { CanonicalIds } from '@/shared/types';
import { calculateTextSimilarity } from './utils/normalize';

interface ProductIdentity {
  canonical: CanonicalIds;
  confidence: number;
}

interface MatchResult {
  ok: boolean;
  confidence: number;
}

export function sameProduct(a: ProductIdentity, b: ProductIdentity, titleA?: string, titleB?: string): MatchResult {
  const canA = a.canonical;
  const canB = b.canonical;
  
  // GTIN match = definitive same product
  if (canA.gtin && canB.gtin && canA.gtin === canB.gtin) {
    return { ok: true, confidence: 1.0 };
  }
  
  // ASIN match = same Amazon product
  if (canA.asin && canB.asin && canA.asin === canB.asin) {
    return { ok: true, confidence: 1.0 };
  }
  
  // Brand + Model match with high title similarity
  if (canA.brand && canB.brand && canA.model && canB.model &&
      canA.brand.toLowerCase() === canB.brand.toLowerCase() &&
      canA.model.toLowerCase() === canB.model.toLowerCase()) {
    
    // If we have titles, check similarity (high threshold)
    if (titleA && titleB) {
      const similarity = calculateTextSimilarity(titleA, titleB);
      if (similarity >= 0.92) {
        return { ok: true, confidence: 0.85 };
      }
      return { ok: false, confidence: similarity };
    }
    
    return { ok: true, confidence: 0.85 }; // Brand + Model match without title check
  }
  
  return { ok: false, confidence: 0 };
}

export function resolveCanonicalIds(productData: any, url: string): CanonicalIds {
  const domain = new URL(url).hostname.toLowerCase();
  
  let { gtin, asin, mpn, brand, model } = productData.canonical || {};
  
  // Extract identifiers based on domain patterns
  if (domain.includes('amazon.')) {
    // Amazon: ASIN is primary, try to extract from URL if not present
    if (!asin && url.includes('/dp/')) {
      const asinMatch = url.match(/\/dp\/([A-Z0-9]{10})/);
      if (asinMatch) asin = asinMatch[1];
    }
    
    if (!asin && url.includes('/gp/product/')) {
      const asinMatch = url.match(/\/gp\/product\/([A-Z0-9]{10})/);
      if (asinMatch) asin = asinMatch[1];
    }
  } else if (domain.includes('mercadolivre.') || domain.includes('mercadolibre.')) {
    // MercadoLivre: Item ID is primary
    if (!mpn && url.includes('ML')) {
      const mlMatch = url.match(/\/(ML[A-Z]\d+)/);
      if (mlMatch) mpn = mlMatch[1];
    }
  }
  
  return {
    gtin: gtin || null,
    asin: asin || null,
    mpn: mpn || null,
    brand: brand || null,
    model: model || null,
  };
}
