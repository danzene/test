import { ProductRaw } from '@/types/product';
import { parsePriceBRL } from '@/utils/assert';

export async function scrapeUniversal(url: string): Promise<ProductRaw> {
  // Import timeout utility
  const { withTimeout } = await import('../../../utils/async');
  
  const response = await withTimeout(fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8',
    },
  }), 6000, "universal-fetch-6s");

  if (!response.ok) {
    throw new Error(`Universal fetch failed: ${response.status}`);
  }

  const html = await response.text();
  
  let title = '';
  let price: number | null = null;
  let imageUrl: string | null = null;
  let brand: string | null = null;
  let gtin: string | null = null;
  let mpn: string | null = null;
  let model: string | null = null;

  // 1. Try to extract from JSON-LD structured data
  const jsonLdMatches = html.match(/<script[^>]*type="application\/ld\+json"[^>]*>(.*?)<\/script>/gis);
  
  if (jsonLdMatches) {
    for (const match of jsonLdMatches) {
      try {
        const scriptContent = match.replace(/<[^>]*>/g, '');
        let jsonData = JSON.parse(scriptContent);
        
        // Handle arrays of structured data
        if (Array.isArray(jsonData)) {
          jsonData = jsonData.find(item => item['@type'] === 'Product');
        }
        
        if (jsonData && jsonData['@type'] === 'Product') {
          title = (jsonData.name || '').replace(/<[^>]*>/g, '').trim();
          brand = (jsonData.brand?.name || jsonData.brand || '').trim() || null;
          model = (jsonData.model || '').trim() || null;
          mpn = (jsonData.mpn || '').trim() || null;
          gtin = (jsonData.gtin13 || jsonData.gtin || jsonData.gtin8 || jsonData.gtin12 || '').trim() || null;
          
          // Extract image
          const images = Array.isArray(jsonData.image) ? jsonData.image : [jsonData.image].filter(Boolean);
          if (images.length > 0) {
            imageUrl = images[0];
          }
          
          // Extract price from offers
          if (jsonData.offers) {
            const offers = Array.isArray(jsonData.offers) ? jsonData.offers : [jsonData.offers];
            const validOffer = offers.find((offer: any) => {
              const priceValue = offer.price || offer.lowPrice;
              const isAvailable = !offer.availability || offer.availability.includes('InStock');
              const hasValidPrice = priceValue && !priceValue.toString().includes('x') && 
                                  !priceValue.toString().includes('juros');
              
              return hasValidPrice && isAvailable && offer.priceCurrency === 'BRL';
            });
            
            if (validOffer) {
              const priceValue = validOffer.price || validOffer.lowPrice;
              price = parsePriceBRL(priceValue);
            }
          }
          
          // If we found comprehensive JSON-LD data, we can return early
          if (title && price) {
            break;
          }
        }
      } catch (e) {
        // Continue trying other scripts
      }
    }
  }

  // 2. Fallback to meta tags if JSON-LD is incomplete
  if (!title) {
    const metaPatterns = [
      /<meta[^>]*property="og:title"[^>]*content="([^"]*)"[^>]*>/i,
      /<meta[^>]*name="twitter:title"[^>]*content="([^"]*)"[^>]*>/i,
      /<title[^>]*>(.*?)<\/title>/is,
    ];
    
    for (const pattern of metaPatterns) {
      const match = html.match(pattern);
      if (match && match[1]) {
        title = match[1].replace(/<[^>]*>/g, '').trim();
        break;
      }
    }
  }

  if (!imageUrl) {
    const imagePatterns = [
      /<meta[^>]*property="og:image"[^>]*content="([^"]*)"[^>]*>/i,
      /<meta[^>]*name="twitter:image"[^>]*content="([^"]*)"[^>]*>/i,
    ];
    
    for (const pattern of imagePatterns) {
      const match = html.match(pattern);
      if (match && match[1]) {
        imageUrl = match[1];
        break;
      }
    }
  }

  if (!price) {
    // Try various meta price patterns
    const priceMetaPatterns = [
      /<meta[^>]*name="twitter:data1"[^>]*content="([^"]*)"[^>]*>/i,
      /<meta[^>]*property="og:price:amount"[^>]*content="([^"]*)"[^>]*>/i,
      /<meta[^>]*itemprop="price"[^>]*content="([^"]*)"[^>]*>/i,
    ];
    
    for (const pattern of priceMetaPatterns) {
      const match = html.match(pattern);
      if (match && match[1] && !match[1].includes('x') && !match[1].includes('juros')) {
        price = parsePriceBRL(match[1]);
        if (price) break;
      }
    }
  }

  // 3. Use heuristic selectors for common e-commerce patterns
  if (!title) {
    const titlePatterns = [
      /<h1[^>]*>(.*?)<\/h1>/is,
      /<h1[^>]*class="[^"]*product[^"]*"[^>]*>(.*?)<\/h1>/is,
      /<span[^>]*class="[^"]*title[^"]*"[^>]*>(.*?)<\/span>/is,
    ];
    
    for (const pattern of titlePatterns) {
      const match = html.match(pattern);
      if (match && match[1]) {
        title = match[1].replace(/<[^>]*>/g, '').trim();
        break;
      }
    }
  }

  if (!price) {
    // Scan for Brazilian currency patterns in the page
    const monetaryPattern = /R\$\s?\d{1,3}(?:\.\d{3})*(?:,\d{2})?/g;
    const monetaryMatches = html.match(monetaryPattern) || [];
    
    // Parse all potential prices and pick a reasonable one
    const validPrices = monetaryMatches
      .map(text => parsePriceBRL(text))
      .filter((p): p is number => p !== null && p > 0 && p < 1000000);
    
    if (validPrices.length > 0) {
      // Pick the most common price, or the first one if no clear consensus
      const priceFreq = validPrices.reduce((acc, p) => {
        acc[p] = (acc[p] || 0) + 1;
        return acc;
      }, {} as Record<number, number>);
      
      const sortedByFreq = Object.entries(priceFreq)
        .sort(([,a], [,b]) => b - a)
        .map(([priceStr]) => parseFloat(priceStr));
      
      price = sortedByFreq[0] || null;
    }
  }

  // 4. Last resort: scan for GTIN patterns in text
  if (!gtin) {
    const plainText = html.replace(/<[^>]*>/g, ' ');
    const gtinMatch = plainText.match(/\b(\d{8}|\d{12}|\d{13}|\d{14})\b/);
    if (gtinMatch) {
      const candidate = gtinMatch[1];
      if ([8, 12, 13, 14].includes(candidate.length)) {
        gtin = candidate;
      }
    }
  }

  return {
    url,
    domain: new URL(url).hostname.replace(/^www\./, ""),
    title: title || 'Produto sem título',
    imageUrl,
    price,
    currency: 'BRL',
    canonical: {
      gtin,
      asin: null,
      mpn,
      brand,
      model,
    },
    quality: (gtin && price) ? 'verified' : 'partial',
  };
}
