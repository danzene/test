// src/worker/search/hybrid-search.ts
import { searchWithSerpAPI } from './serp-search';

export interface ProductSearchResult {
  title: string;
  price: number;
  currency: string;
  domain: string;
  url: string;
  imageUrl?: string;
  confidence: number;
}

/**
 * Busca real usando SerpAPI (Google Shopping)
 * Retorna produtos ordenados do MENOR preço pro MAIOR
 */
export async function hybridSearch(
  apiKey: string,
  query: string,
  maxResults: number = 5
): Promise<ProductSearchResult[]> {
  
  console.log(`🔍 Real search via SerpAPI: "${query}"`);
  
  if (!apiKey || apiKey.length === 0) {
    console.error('❌ SERP_API_KEY not configured');
    return [];
  }
  
  try {
    // Busca real no Google Shopping
    const serpResults = await searchWithSerpAPI(apiKey, query, 'google_shopping');
    
    console.log(`📦 SerpAPI returned ${serpResults.length} results`);
    
    // Converter para formato esperado e filtrar produtos válidos
    const results: ProductSearchResult[] = serpResults
      .filter(r => {
        const hasPrice = r.price && r.price > 0;
        const hasUrl = r.url && r.url.length > 0;
        const hasTitle = r.title && r.title.length > 0;
        return hasPrice && hasUrl && hasTitle;
      })
      .map(r => ({
        title: r.title,
        price: r.price!,
        currency: 'BRL',
        domain: extractDomain(r.url),
        url: r.url,
        imageUrl: r.image,
        confidence: 0.9,
      }))
      .sort((a, b) => a.price - b.price) // ✅ ORDENAR: menor → maior
      .slice(0, maxResults);
    
    console.log(`✅ Returning ${results.length} products (sorted by price)`);
    
    if (results.length > 0) {
      console.log(`💰 Price range: R$ ${results[0].price} - R$ ${results[results.length - 1].price}`);
    }
    
    return results;
    
  } catch (error) {
    console.error('❌ SerpAPI search failed:', error);
    return [];
  }
}

function extractDomain(url: string): string {
  try {
    const hostname = new URL(url).hostname.replace('www.', '');
    
    // Normalizar domínios conhecidos
    if (hostname.includes('amazon')) return 'amazon.com.br';
    if (hostname.includes('mercadolivre') || hostname.includes('mercadolibre')) return 'mercadolivre.com.br';
    if (hostname.includes('magazineluiza') || hostname.includes('magalu')) return 'magazineluiza.com.br';
    if (hostname.includes('kabum')) return 'kabum.com.br';
    if (hostname.includes('americanas')) return 'americanas.com.br';
    if (hostname.includes('submarino')) return 'submarino.com.br';
    if (hostname.includes('casasbahia')) return 'casasbahia.com.br';
    
    return hostname;
  } catch {
    return 'unknown';
  }
}
