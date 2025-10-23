import { extractFirstProductFromSearchPage, SearchResultProduct } from './search-results';
import { domainPool } from '../../utils/pool';
import { withTimeout } from '../../utils/async';

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
 * Search for products by name across multiple stores
 * Uses REAL search page URLs (not fake product URLs from AI)
 */
export async function searchProductsByName(
  env: any,
  db: any,
  query: string,
  maxResults: number = 5
): Promise<ProductSearchResult[]> {
  
  console.log(`🔍 searchProductsByName: "${query}"`);
  
  const results: ProductSearchResult[] = [];
  const startTime = Date.now();
  const BUDGET_MS = 30000; // 30 seconds for search
  
  // Build REAL search URLs for each store
  const searchUrls = buildSearchUrls(query);
  
  console.log(`📄 Built ${searchUrls.length} search URLs`);
  
  // Process each store search page
  const promises = searchUrls.map(async ({ url, domain }) => {
    try {
      const product = await domainPool(url, async () => {
        return await withTimeout(
          extractFirstProductFromSearchPage(url),
          10000,
          'search-page-timeout'
        );
      });
      
      if (product && product.price && product.price > 0) {
        console.log(`✅ ${domain}: "${product.title}" - R$ ${product.price}`);
        return {
          ...product,
          confidence: 0.9, // Search results are high confidence (real pages)
        };
      } else {
        console.log(`⚠️ ${domain}: No valid product found`);
        return null;
      }
      
    } catch (error) {
      console.error(`❌ ${domain} failed:`, error instanceof Error ? error.message : String(error));
      return null;
    }
  });
  
  // Wait for all promises with timeout
  const settled = await Promise.allSettled(
    promises.map(p => 
      Promise.race([
        p,
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('timeout')), BUDGET_MS)
        )
      ])
    )
  );
  
  // Collect successful results
  for (const result of settled) {
    if (result.status === 'fulfilled' && result.value) {
      results.push(result.value as ProductSearchResult);
    }
  }
  
  // Sort by price (lowest first)
  results.sort((a, b) => a.price - b.price);
  
  console.log(`📊 Total found: ${results.length}, returning top ${Math.min(maxResults, results.length)}`);
  
  return results.slice(0, maxResults);
}

/**
 * Build REAL SEARCH URLs for each store
 * These are actual working search pages, not fake product URLs
 */
function buildSearchUrls(query: string): Array<{ url: string; domain: string }> {
  const encoded = encodeURIComponent(query);
  
  return [
    {
      url: `https://www.amazon.com.br/s?k=${encoded}`,
      domain: 'Amazon',
    },
    {
      url: `https://lista.mercadolivre.com.br/${encoded}`,
      domain: 'Mercado Livre',
    },
    {
      url: `https://www.magazineluiza.com.br/busca/${encoded}`,
      domain: 'Magazine Luiza',
    },
    {
      url: `https://www.kabum.com.br/busca/${encoded}`,
      domain: 'KaBuM',
    },
    {
      url: `https://www.americanas.com.br/busca/${encoded}`,
      domain: 'Americanas',
    },
  ];
}
