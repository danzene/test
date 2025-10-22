import { ProductRaw } from '@/types/product';
import { parsePriceBRL } from '@/utils/assert';

export function isKabum(url: string): boolean {
  return url.includes('kabum.com.br');
}

export async function scrapeKabum(url: string): Promise<ProductRaw> {
  // Import timeout utility
  const { withTimeout } = await import('../../../utils/async');
  
  const response = await withTimeout(fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8',
    },
  }), 6000, "kabum-fetch-6s");

  if (!response.ok) {
    throw new Error(`KaBuM fetch failed: ${response.status}`);
  }

  const html = await response.text();
  
  let title = '';
  let price: number | null = null;
  let imageUrl: string | null = null;
  let brand: string | null = null;
  let gtin: string | null = null;
  let mpn: string | null = null;
  let model: string | null = null;

  // 1. Try JSON-LD first
  const jsonLdMatch = html.match(/<script[^>]*type="application\/ld\+json"[^>]*>(.*?)<\/script>/is);
  if (jsonLdMatch) {
    try {
      let jsonData = JSON.parse(jsonLdMatch[1]);
      if (Array.isArray(jsonData)) {
        jsonData = jsonData.find(item => item['@type'] === 'Product');
      }
      
      if (jsonData && jsonData['@type'] === 'Product') {
        title = (jsonData.name || '').replace(/<[^>]*>/g, '').trim();
        brand = (jsonData.brand?.name || jsonData.brand || '').trim() || null;
        model = (jsonData.model || '').trim() || null;
        mpn = (jsonData.mpn || '').trim() || null;
        gtin = (jsonData.gtin13 || jsonData.gtin || '').trim() || null;
        imageUrl = Array.isArray(jsonData.image) ? jsonData.image[0] : jsonData.image;
        
        if (jsonData.offers) {
          const offers = Array.isArray(jsonData.offers) ? jsonData.offers : [jsonData.offers];
          const validOffer = offers.find((offer: any) => 
            (offer.price || offer.lowPrice) && 
            offer.priceCurrency === 'BRL' &&
            (!offer.availability || offer.availability.includes('InStock'))
          );
          
          if (validOffer) {
            const priceText = validOffer.price || validOffer.lowPrice;
            price = parsePriceBRL(priceText);
          }
        }
      }
    } catch (e) {
      // Continue with fallback
    }
  }

  // 2. Fallback to KaBuM-specific selectors
  if (!title) {
    const titlePatterns = [
      /<h1[^>]*class="[^"]*sc-[^"]*-title[^"]*"[^>]*>(.*?)<\/h1>/is,
      /<h1[^>]*>(.*?)<\/h1>/is,
    ];
    
    for (const pattern of titlePatterns) {
      const match = html.match(pattern);
      if (match) {
        title = match[1].replace(/<[^>]*>/g, '').trim();
        break;
      }
    }
  }

  if (!price) {
    // KaBuM price patterns (avoid installments)
    const pricePatterns = [
      /<span[^>]*class="[^"]*finalPrice[^"]*"[^>]*>([^<]+)<\/span>/g,
      /<div[^>]*class="[^"]*finalPrice[^"]*"[^>]*>([^<]+)<\/div>/g,
      /<strong[^>]*class="[^"]*price[^"]*"[^>]*>([^<]+)<\/strong>/g,
    ];
    
    for (const pattern of pricePatterns) {
      const matches = Array.from(html.matchAll(pattern));
      for (const match of matches) {
        if (!match[1].includes('x') && !match[1].includes('juros') && !match[1].includes('de R$')) {
          const parsedPrice = parsePriceBRL(match[1]);
          if (parsedPrice && parsedPrice > 0) {
            price = parsedPrice;
            break;
          }
        }
      }
      if (price) break;
    }
  }

  if (!imageUrl) {
    // KaBuM image patterns
    const imagePatterns = [
      /<img[^>]*class="[^"]*imageProduct[^"]*"[^>]*src="([^"]*)"[^>]*>/i,
      /<meta[^>]*property="og:image"[^>]*content="([^"]*)"[^>]*>/i,
    ];
    
    for (const pattern of imagePatterns) {
      const match = html.match(pattern);
      if (match) {
        imageUrl = match[1];
        break;
      }
    }
  }

  // 3. Extract from technical specifications
  if (!gtin || !brand || !model) {
    // Look for technical specs table
    const specsMatch = html.match(/<table[^>]*class="[^"]*table[^"]*"[^>]*>(.*?)<\/table>/is);
    if (specsMatch) {
      const specsTable = specsMatch[1];
      
      // Extract GTIN/EAN
      if (!gtin) {
        const gtinPatterns = [
          /<td[^>]*>EAN<\/td>\s*<td[^>]*>(\d{13})<\/td>/i,
          /<td[^>]*>GTIN<\/td>\s*<td[^>]*>(\d{13})<\/td>/i,
          /<td[^>]*>Código de Barras<\/td>\s*<td[^>]*>(\d{13})<\/td>/i,
        ];
        
        for (const pattern of gtinPatterns) {
          const match = specsTable.match(pattern);
          if (match) {
            gtin = match[1];
            break;
          }
        }
      }
      
      // Extract brand
      if (!brand) {
        const brandPattern = /<td[^>]*>Marca<\/td>\s*<td[^>]*>([^<]+)<\/td>/i;
        const brandMatch = specsTable.match(brandPattern);
        if (brandMatch) {
          brand = brandMatch[1].trim() || null;
        }
      }
      
      // Extract model
      if (!model) {
        const modelPattern = /<td[^>]*>Modelo<\/td>\s*<td[^>]*>([^<]+)<\/td>/i;
        const modelMatch = specsTable.match(modelPattern);
        if (modelMatch) {
          model = modelMatch[1].trim() || null;
        }
      }
    }
  }

  return {
    url,
    domain: new URL(url).hostname.replace(/^www\./, ""),
    title: title || 'Produto KaBuM',
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
    quality: gtin ? 'verified' : 'partial',
  };
}
