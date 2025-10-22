import { ProductRaw } from '@/types/product';
import { parsePriceBRL } from '@/utils/assert';

export function isMagalu(url: string): boolean {
  return url.includes('magazineluiza.com.br') || url.includes('magalu.com.br');
}

export async function scrapeMagalu(url: string): Promise<ProductRaw> {
  // Import timeout utility
  const { withTimeout } = await import('../../../utils/async');
  
  const response = await withTimeout(fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8',
    },
  }), 6000, "magalu-fetch-6s");

  if (!response.ok) {
    throw new Error(`Magalu fetch failed: ${response.status}`);
  }

  const html = await response.text();
  
  let title = '';
  let price: number | null = null;
  let imageUrl: string | null = null;
  let brand: string | null = null;
  let gtin: string | null = null;
  let mpn: string | null = null;
  let model: string | null = null;

  // 1. Try __NEXT_DATA__ extraction first (most reliable for Magalu)
  const nextDataMatch = html.match(/<script[^>]*id="__NEXT_DATA__"[^>]*>(.*?)<\/script>/s);
  if (nextDataMatch) {
    try {
      const nextData = JSON.parse(nextDataMatch[1]);
      const productData = nextData?.props?.pageProps?.data?.product;
      
      if (productData) {
        title = (productData.name || '').replace(/<[^>]*>/g, '').trim();
        brand = (productData.brand?.name || productData.brand || '').trim() || null;
        model = (productData.model || '').trim() || null;
        
        // Extract price - prefer bestPrice, then asNumber
        const priceData = productData.price;
        if (priceData) {
          const bestPrice = priceData.bestPrice || priceData.asNumber;
          if (typeof bestPrice === 'number' && bestPrice > 0) {
            price = Number(bestPrice.toFixed(2));
          } else if (typeof bestPrice === 'string') {
            price = parsePriceBRL(bestPrice);
          }
        }
        
        // Extract image
        if (productData.images && productData.images.length > 0) {
          imageUrl = productData.images[0].url || productData.images[0];
        }
        
        // Extract GTIN/EAN from specifications
        if (productData.specifications) {
          for (const spec of productData.specifications) {
            if (spec.name && (spec.name.includes('EAN') || spec.name.includes('GTIN'))) {
              gtin = (spec.value || '').trim() || null;
              break;
            }
          }
        }
      }
    } catch (e) {
      // Continue with fallback methods
    }
  }

  // 2. Try JSON-LD if __NEXT_DATA__ didn't work
  if (!title || !price) {
    const jsonLdMatch = html.match(/<script[^>]*type="application\/ld\+json"[^>]*>(.*?)<\/script>/is);
    if (jsonLdMatch) {
      try {
        let jsonData = JSON.parse(jsonLdMatch[1]);
        if (Array.isArray(jsonData)) {
          jsonData = jsonData.find(item => item['@type'] === 'Product');
        }
        
        if (jsonData && jsonData['@type'] === 'Product') {
          if (!title) title = (jsonData.name || '').replace(/<[^>]*>/g, '').trim();
          if (!brand) brand = (jsonData.brand?.name || jsonData.brand || '').trim() || null;
          if (!model) model = (jsonData.model || '').trim() || null;
          if (!mpn) mpn = (jsonData.mpn || '').trim() || null;
          if (!gtin) gtin = (jsonData.gtin13 || jsonData.gtin || '').trim() || null;
          if (!imageUrl) imageUrl = Array.isArray(jsonData.image) ? jsonData.image[0] : jsonData.image;
          
          if (!price && jsonData.offers) {
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
  }

  // 3. Fallback to Magalu-specific selectors
  if (!title) {
    const titleMatch = html.match(/<h1[^>]*data-testid="heading-product-title"[^>]*>(.*?)<\/h1>/is);
    if (titleMatch) {
      title = titleMatch[1].replace(/<[^>]*>/g, '').trim();
    }
  }

  if (!price) {
    // Magalu price patterns - focus on data-testid
    const priceMatch = html.match(/<span[^>]*data-testid="price-value"[^>]*>([^<]+)<\/span>/);
    if (priceMatch) {
      price = parsePriceBRL(priceMatch[1]);
    }
  }

  if (!imageUrl) {
    const ogImageMatch = html.match(/<meta[^>]*property="og:image"[^>]*content="([^"]*)"[^>]*>/i);
    if (ogImageMatch) {
      imageUrl = ogImageMatch[1];
    }
  }

  // Extract from "Ficha técnica" if not found
  if (!gtin) {
    const fichaMatch = html.match(/ficha[^>]*técnica[\s\S]*?EAN[^:]*:\s*(\d{13})/i);
    if (fichaMatch) {
      gtin = fichaMatch[1];
    }
  }

  return {
    url,
    domain: new URL(url).hostname.replace(/^www\./, ""),
    title: title || 'Produto Magalu',
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
    quality: (gtin && price && price > 0) ? 'verified' : 'partial',
  };
}
