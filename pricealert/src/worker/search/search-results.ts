import { withTimeout } from '../../utils/async';
import { parsePriceBRL } from '../../utils/assert';

export interface SearchResultProduct {
  title: string;
  price: number | null;
  currency: string;
  domain: string;
  url: string;
  imageUrl?: string;
}

/**
 * Extract first product from search results page
 */
export async function extractFirstProductFromSearchPage(
  searchUrl: string
): Promise<SearchResultProduct | null> {
  console.log(`📄 Extracting product from search page: ${searchUrl}`);
  
  try {
    const response = await withTimeout(
      fetch(searchUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'pt-BR,pt;q=0.9',
          'Referer': 'https://www.google.com/',
          'Cache-Control': 'max-age=0',
        },
        redirect: 'follow',
      }),
      10000,
      'search-page-timeout'
    );

    if (!response.ok) {
      console.error(`❌ Search page failed: ${response.status}`);
      return null;
    }

    const html = await response.text();
    const domain = new URL(searchUrl).hostname.replace('www.', '');

    let title: string | null = null;
    let price: number | null = null;
    let imageUrl: string | null = null;
    let productUrl: string | null = null;

    // Extract based on store using regex patterns
    if (domain.includes('amazon')) {
      // Amazon: Look for first product in search results
      const titleMatch = html.match(/<span[^>]*class="[^"]*a-size-medium[^"]*a-text-normal[^"]*"[^>]*>([^<]+)<\/span>/);
      title = titleMatch ? titleMatch[1].trim() : null;
      
      // Extract price from a-price-whole and a-price-fraction
      const priceMatch = html.match(/<span[^>]*class="[^"]*a-price-whole[^"]*"[^>]*>([^<]+)<\/span>[^<]*<span[^>]*class="[^"]*a-price-fraction[^"]*"[^>]*>([^<]+)<\/span>/);
      if (priceMatch) {
        price = parsePriceBRL(`R$ ${priceMatch[1]},${priceMatch[2]}`);
      }
      
      const imgMatch = html.match(/<img[^>]*class="[^"]*s-image[^"]*"[^>]*src="([^"]+)"/);
      imageUrl = imgMatch ? imgMatch[1] : null;
      
      const urlMatch = html.match(/<a[^>]*class="[^"]*a-link-normal[^"]*s-no-outline[^"]*"[^>]*href="([^"]+)"/);
      productUrl = urlMatch ? `https://www.amazon.com.br${urlMatch[1].split('?')[0]}` : null;
      
    } else if (domain.includes('mercadolivre') || domain.includes('mercadolibre')) {
      // Mercado Livre: Look for poly-card or ui-search-result
      const titleMatch = html.match(/<h2[^>]*class="[^"]*poly-component__title[^"]*"[^>]*>([^<]+)<\/h2>/) ||
                        html.match(/<h2[^>]*class="[^"]*ui-search-item__title[^"]*"[^>]*>([^<]+)<\/h2>/);
      title = titleMatch ? titleMatch[1].trim() : null;
      
      // Extract price
      const priceMatch = html.match(/<span[^>]*class="[^"]*andes-money-amount__fraction[^"]*"[^>]*>([^<]+)<\/span>/);
      if (priceMatch) {
        const priceText = priceMatch[1].replace(/\./g, '').replace(',', '.');
        price = parseFloat(priceText);
      }
      
      const imgMatch = html.match(/<img[^>]*class="[^"]*poly-component__picture[^"]*"[^>]*src="([^"]+)"/);
      imageUrl = imgMatch ? imgMatch[1] : null;
      
      const urlMatch = html.match(/<a[^>]*class="[^"]*poly-component__title-link[^"]*"[^>]*href="([^"]+)"/);
      productUrl = urlMatch ? urlMatch[1].split('?')[0] : null;
      
    } else if (domain.includes('magazineluiza') || domain.includes('magalu')) {
      // Magazine Luiza: Look for product cards
      const titleMatch = html.match(/data-testid="product-title"[^>]*>([^<]+)</) ||
                        html.match(/<h2[^>]*class="[^"]*product-title[^"]*"[^>]*>([^<]+)<\/h2>/);
      title = titleMatch ? titleMatch[1].trim() : null;
      
      // Extract price
      const priceMatch = html.match(/data-testid="price-value"[^>]*>\s*R?\$?\s*([\d.,]+)\s*</);
      if (priceMatch) {
        price = parsePriceBRL(`R$ ${priceMatch[1]}`);
      }
      
      const imgMatch = html.match(/data-testid="product-image"[^>]*src="([^"]+)"/);
      imageUrl = imgMatch ? imgMatch[1] : null;
      
      const urlMatch = html.match(/data-testid="product-card-container"[^>]*href="([^"]+)"/);
      productUrl = urlMatch ? `https://www.magazineluiza.com.br${urlMatch[1]}` : null;
      
    } else if (domain.includes('kabum')) {
      // KaBuM: Look for product cards
      const titleMatch = html.match(/<span[^>]*class="[^"]*nameCard[^"]*"[^>]*>([^<]+)<\/span>/);
      title = titleMatch ? titleMatch[1].trim() : null;
      
      // Extract price
      const priceMatch = html.match(/<span[^>]*class="[^"]*priceCard[^"]*"[^>]*>R?\$?\s*([\d.,]+)\s*<\/span>/);
      if (priceMatch) {
        price = parsePriceBRL(`R$ ${priceMatch[1]}`);
      }
      
      const imgMatch = html.match(/<img[^>]*class="[^"]*imageCard[^"]*"[^>]*src="([^"]+)"/);
      imageUrl = imgMatch ? imgMatch[1] : null;
      
      const urlMatch = html.match(/<a[^>]*class="[^"]*productLink[^"]*"[^>]*href="([^"]+)"/);
      productUrl = urlMatch ? `https://www.kabum.com.br${urlMatch[1]}` : null;
      
    } else {
      // Generic store: Try common patterns
      const titleMatch = html.match(/<h[123][^>]*class="[^"]*product[^"]*title[^"]*"[^>]*>([^<]+)<\/h[123]>/) ||
                        html.match(/<span[^>]*class="[^"]*product[^"]*name[^"]*"[^>]*>([^<]+)<\/span>/);
      title = titleMatch ? titleMatch[1].trim() : null;
      
      // Look for price in BRL format
      const priceMatch = html.match(/R\$\s*([\d.,]+)/);
      if (priceMatch) {
        price = parsePriceBRL(`R$ ${priceMatch[1]}`);
      }
      
      const imgMatch = html.match(/<img[^>]*src="([^"]+)"[^>]*alt="[^"]*product/i);
      imageUrl = imgMatch ? imgMatch[1] : null;
      
      const urlMatch = html.match(/<a[^>]*href="([^"]+)"[^>]*class="[^"]*product[^"]*link/);
      productUrl = urlMatch ? urlMatch[1] : null;
    }

    // Validate extracted data
    if (!title || !price || price <= 0 || !productUrl) {
      console.log(`⚠️ Incomplete product data from ${domain}: title=${!!title}, price=${price}, url=${!!productUrl}`);
      return null;
    }

    // Resolve relative URLs
    if (productUrl.startsWith('/')) {
      const baseUrl = new URL(searchUrl);
      productUrl = `${baseUrl.protocol}//${baseUrl.hostname}${productUrl}`;
    } else if (!productUrl.startsWith('http')) {
      const baseUrl = new URL(searchUrl);
      productUrl = `${baseUrl.protocol}//${baseUrl.hostname}/${productUrl}`;
    }

    console.log(`✅ Found product from ${domain}: "${title}" - R$ ${price}`);

    return {
      title: title.trim(),
      price,
      currency: 'BRL',
      domain,
      url: productUrl,
      imageUrl: imageUrl || undefined,
    };

  } catch (error) {
    console.error(`❌ Error extracting from search page:`, error instanceof Error ? error.message : String(error));
    return null;
  }
}
