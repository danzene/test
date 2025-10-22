import { ProductRaw } from '@/types/product';
import { parsePriceBRL } from '@/utils/assert';

const ASIN_RE = /\/(dp|gp\/product)\/([A-Z0-9]{10})(?:[/?]|$)/i;

export function isAmazonBr(url: string): boolean {
  return url.includes('amazon.com.br');
}

function extractAsin(html: string, url: string): string | null {
  return html.match(ASIN_RE)?.[2]
    || html.match(/<link[^>]+rel=["']canonical["'][^>]+href=["'][^"']+\/(dp|gp\/product)\/([A-Z0-9]{10})/i)?.[2]
    || html.match(/<meta[^>]+property=["']og:url["'][^>]+content=["'][^"']+\/(dp|gp\/product)\/([A-Z0-9]{10})/i)?.[2]
    || url.match(ASIN_RE)?.[2]
    || null;
}

function extractBuyboxPrice(html: string): number | null {
  // Padrão 1: apex_desktop
  const block = html.match(/<div[^>]+id=["'](apex_desktop|corePriceDisplay_desktop_feature_div)["'][\s\S]*?<\/div>/i)?.[0];
  if (block) {
    const spans = [...block.matchAll(/<span[^>]+class="[^"]*\ba-offscreen\b[^"]*"[^>]*>([^<]+)<\/span>/gi)]
      .map(m => (m[1] || "").trim())
      .filter(t => !/de\s*R\$|juros|parcela/i.test(t));
    for (const t of spans) {
      const v = parsePriceBRL(t);
      if (v) return v;
    }
  }
  
  // ✅ NOVO: Padrão 2 - Preço em data attributes
  const dataPrice = html.match(/data-a-color="price"[^>]*>([^<]+)<\/span>/i)?.[1];
  if (dataPrice) {
    const v = parsePriceBRL(dataPrice);
    if (v) return v;
  }
  
  // ✅ NOVO: Padrão 3 - Preço no título da página (último recurso)
  const titlePrice = html.match(/<title>[^<]*R\$\s*([\d\.,]+)[^<]*<\/title>/i)?.[1];
  if (titlePrice) {
    const v = parsePriceBRL(`R$ ${titlePrice}`);
    if (v) return v;
  }
  
  return null;
}

export async function scrapeAmazonBr(url: string): Promise<ProductRaw> {
  // Import timeout utility
  const { withTimeout } = await import('../../../utils/async');
  
  const res = await withTimeout(fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8",
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9",
    },
    redirect: "follow",
  }), 6000, "amazon-fetch-6s");
  
  if (!res.ok) {
    throw new Error(`Amazon fetch failed: ${res.status}`);
  }

  const finalUrl = res.url || url;
  const html = await res.text();

  const asin = extractAsin(html, finalUrl);
  let price: number | null = null;

  // JSON-LD
  const ld = html.match(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi) || [];
  for (const s of ld) {
    try {
      const j = JSON.parse(s.replace(/^<script[^>]*>|<\/script>$/gi, ""));
      const arr = Array.isArray(j) ? j : [j];
      const prod = arr.find(x => x?.["@type"] === "Product");
      const off = prod?.offers;
      if (off) {
        const offers = Array.isArray(off) ? off : [off];
        const o = offers.find((o: any) => (o.price || o.lowPrice) && (!o.priceCurrency || o.priceCurrency === "BRL"));
        if (o) { 
          price = parsePriceBRL(`R$ ${String(o.price ?? o.lowPrice)}`); 
          if (price) break; 
        }
      }
    } catch {}
  }
  
  if (!price) price = extractBuyboxPrice(html);
  
  if (!price) {
    const og = html.match(/og:price:amount["'][^>]+content=["']([^"']+)["']/i)?.[1];
    if (og) price = parsePriceBRL(`R$ ${og}`);
  }

  const title = (html.match(/<span[^>]*id=["']productTitle["'][^>]*>(.*?)<\/span>/is)?.[1] || "")
    .replace(/<[^>]*>/g, "").trim()
    || html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i)?.[1]
    || "Produto Amazon";
    
  const imageUrl =
    html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)?.[1]
    || html.match(/<img[^>]+id=["']landingImage["'][^>]+src=["']([^"']+)["']/i)?.[1]
    || null;

  return {
    url: finalUrl,
    domain: new URL(finalUrl).hostname.replace(/^www\./, ""),
    title,
    imageUrl,
    price: price ?? null,
    currency: "BRL",
    canonical: { asin, gtin: null, mpn: null, brand: null, model: null },
    quality: asin && price ? "verified" : "partial",
  };
}
