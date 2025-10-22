import { ProductRaw } from '@/types/product';
import { isAmazonBr, scrapeAmazonBr } from './adapters/amazonBr';
import { isMercadoLivre, scrapeMercadoLivre } from './adapters/mercadolivre';
import { isMagalu, scrapeMagalu } from './adapters/magalu';
import { isKabum, scrapeKabum } from './adapters/kabum';
import { scrapeUniversal } from './adapters/universal';
import { resolveCanonicalIds } from './identity';
import { getCachedProductRaw, setCachedProductRaw } from '../../utils/cache';
import { withTimeout } from '../../utils/async';

export async function ingestProduct(url: string): Promise<ProductRaw> {
  // Check cache first
  const cached = getCachedProductRaw(url);
  if (cached) {
    return cached;
  }
  
  let productData: ProductRaw;
  
  try {
    // Apply global timeout to entire ingestion process
    productData = await withTimeout((async () => {
      // Route to appropriate adapter based on domain
      if (isAmazonBr(url)) {
        return await scrapeAmazonBr(url);
      } else if (isMercadoLivre(url)) {
        return await scrapeMercadoLivre(url);
      } else if (isMagalu(url)) {
        return await scrapeMagalu(url);
      } else if (isKabum(url)) {
        return await scrapeKabum(url);
      } else {
        return await scrapeUniversal(url);
      }
    })(), 12000, "ingest-12s"); // ✅ Aumentar de 8s para 12s
    
    // Resolve and enhance canonical IDs
    const enhancedCanonical = resolveCanonicalIds(productData, url);
    
    // Merge canonical data back into product
    productData.canonical = enhancedCanonical;
    
    // Determine verification status
    const verified = !!(enhancedCanonical.gtin || enhancedCanonical.asin);
    productData.quality = verified ? 'verified' : 'partial';
    
    // Cache the result
    setCachedProductRaw(url, productData);
    
    return productData;
    
  } catch (error) {
    console.error('Product ingestion failed:', error);
    throw new Error(`Failed to ingest product from ${url}: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export function extractDomain(url: string): string {
  try {
    const domain = new URL(url).hostname.toLowerCase();
    if (domain.includes('amazon.')) return 'amazon';
    if (domain.includes('mercadolivre.') || domain.includes('mercadolibre.')) return 'mercadolivre';
    if (domain.includes('magazineluiza.') || domain.includes('magalu.')) return 'magalu';
    if (domain.includes('kabum.')) return 'kabum';
    if (domain.includes('americanas.')) return 'americanas';
    if (domain.includes('submarino.')) return 'submarino';
    if (domain.includes('casasbahia.')) return 'casasbahia';
    if (domain.includes('shopee.')) return 'shopee';
    if (domain.includes('carrefour.')) return 'carrefour';
    if (domain.includes('extra.')) return 'extra';
    return domain.replace('www.', '');
  } catch {
    return 'unknown';
  }
}
