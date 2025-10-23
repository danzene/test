export interface SerpProduct {
  title: string;
  price: number | null;
  store: string;
  url: string;
  image?: string;
}

/**
 * Search for products using SerpAPI
 */
export async function searchWithSerpAPI(
  apiKey: string,
  query: string,
  engine: 'google_shopping' | 'amazon' | 'bing' = 'google_shopping'
): Promise<SerpProduct[]> {
  
  console.log(`🔍 SerpAPI: Searching "${query}" with ${engine}`);
  
  if (!apiKey) {
    throw new Error('SERP_API_KEY not configured');
  }

  try {
    const params = new URLSearchParams({
      api_key: apiKey,
      engine: engine,
      q: query,
      num: '5',
      hl: 'pt-br',
      gl: 'br'
    });

    // Add engine-specific parameters
    if (engine === 'google_shopping') {
      params.set('tbm', 'shop');
    } else if (engine === 'amazon') {
      params.set('amazon_domain', 'amazon.com.br');
    }

    const url = `https://serpapi.com/search?${params.toString()}`;

    console.log(`📡 SerpAPI request to: ${engine}`);

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; PriceHunter/1.0)',
      },
    });

    if (!response.ok) {
      console.error(`❌ SerpAPI error: ${response.status} ${response.statusText}`);
      const errorText = await response.text();
      console.error(`Error details: ${errorText}`);
      return [];
    }

    const data = await response.json();
    const results: SerpProduct[] = [];

    // Parse results based on engine
    if (engine === 'google_shopping') {
      // Google Shopping results
      const shopping_results = data.shopping_results || [];
      for (const item of shopping_results.slice(0, 5)) {
        if (item.title && item.link) {
          results.push({
            title: item.title,
            price: item.price ? parsePrice(item.price) : null,
            store: item.source || 'Shopping',
            url: item.link,
            image: item.thumbnail,
          });
        }
      }
    } else if (engine === 'amazon') {
      // Amazon results
      const products = data.products || [];
      for (const item of products.slice(0, 5)) {
        if (item.title && item.link) {
          results.push({
            title: item.title,
            price: item.price ? parsePrice(String(item.price)) : null,
            store: 'Amazon',
            url: item.link,
            image: item.image,
          });
        }
      }
    } else if (engine === 'bing') {
      // Bing search results
      const organic_results = data.organic_results || [];
      for (const item of organic_results.slice(0, 5)) {
        if (item.title && item.link) {
          results.push({
            title: item.title,
            price: extractPriceFromText(item.snippet || ''),
            store: getDomainFromUrl(item.link),
            url: item.link,
          });
        }
      }
    }

    console.log(`✅ SerpAPI found ${results.length} products`);
    return results.filter(r => r.title && r.url);

  } catch (error) {
    console.error(`❌ SerpAPI error:`, error);
    return [];
  }
}

/**
 * Parse price from string
 */
function parsePrice(priceStr: string): number | null {
  if (!priceStr) return null;
  
  // Remove currency symbols and extra spaces
  const cleaned = priceStr
    .toString()
    .replace(/[R$\s]/g, '')
    .replace(/[^\d.,]/g, '');

  if (!cleaned) return null;

  // Handle Brazilian format (1.299,99 or 1299,99)
  let numStr = cleaned;
  if (cleaned.includes(',') && cleaned.includes('.')) {
    // Format: 1.299,99
    numStr = cleaned.replace(/\./g, '').replace(',', '.');
  } else if (cleaned.includes(',')) {
    // Format: 1299,99
    numStr = cleaned.replace(',', '.');
  }

  const num = parseFloat(numStr);
  return isFinite(num) && num > 0 ? Number(num.toFixed(2)) : null;
}

/**
 * Extract price from text snippet
 */
function extractPriceFromText(text: string): number | null {
  if (!text) return null;
  
  const matches = text.match(/R\$\s*(\d+(?:[.,]\d{3})*(?:[.,]\d{2})?)/g);
  if (!matches) return null;

  for (const match of matches) {
    const price = parsePrice(match);
    if (price && price > 0) {
      return price;
    }
  }

  return null;
}

/**
 * Extract domain from URL for store identification
 */
function getDomainFromUrl(url: string): string {
  try {
    const domain = new URL(url).hostname.replace('www.', '');
    
    if (domain.includes('amazon')) return 'Amazon';
    if (domain.includes('mercadolivre') || domain.includes('mercadolibre')) return 'Mercado Livre';
    if (domain.includes('magazineluiza') || domain.includes('magalu')) return 'Magalu';
    if (domain.includes('kabum')) return 'KaBuM';
    if (domain.includes('americanas')) return 'Americanas';
    
    return domain;
  } catch {
    return 'Unknown';
  }
}
