import { ProductRaw } from '@/types/product';
import { parsePriceBRL } from '@/utils/assert';
import { extractMlIdFromUrl, extractMlIdFromHtml, extractGoTarget } from '../utils/ml';

// Helper functions for HTML parsing (fallback when API returns 403)
function parseJsonLdPrice(html: string): number | null {
  const scripts = html.match(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi) || [];
  for (const s of scripts) {
    try {
      const j = JSON.parse(s.replace(/^<script[^>]*>|<\/script>$/gi, "").trim());
      const arr = Array.isArray(j) ? j : [j];
      const prod = arr.find((x: any) => x?.["@type"] === "Product");
      if (prod?.offers) {
        const offers = Array.isArray(prod.offers) ? prod.offers : [prod.offers];
        const o = offers.find((o: any) => (o.price || o.lowPrice));
        const raw = String(o?.price ?? o?.lowPrice);
        return parsePriceBRL(raw);
      }
    } catch {}
  }
  return null;
}

function parseTitle(html: string): string {
  const h1 = html.match(/<h1[^>]*>(.*?)<\/h1>/is)?.[1]?.replace(/<[^>]*>/g, "").trim();
  const og = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i)?.[1];
  return (h1 || og || "Produto Mercado Livre").trim();
}

function parseImage(html: string): string | null {
  return html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)?.[1] || null;
}

function parseAttributes(html: string) {
  // Try to extract GTIN/EAN, brand, and model from specifications table
  const spec = html.match(/<table[^>]*>[\s\S]*?<\/table>/i)?.[0] || html;
  const ean = spec.match(/EAN[\s:]*([0-9\.\-]+)/i)?.[1]?.replace(/\D/g, "");
  const brand = spec.match(/Marca[\s:]*([^<\n]+)/i)?.[1]?.trim();
  const model = spec.match(/Modelo[\s:]*([^<\n]+)/i)?.[1]?.trim();
  return { 
    gtin: ean && ean.length >= 8 ? ean : undefined, 
    brand: brand || undefined, 
    model: model || undefined 
  };
}

export function isMercadoLivre(url: string): boolean {
  const h = new URL(url).hostname.replace(/^www\./, "").toLowerCase();
  return /(^|\.)mercadolivre\.com\.br$/.test(h) || /mercadolibre\./.test(h);
}

async function resolveIdAndFinalUrl(inputUrl: string): Promise<{ id: string | null; finalUrl: string; html?: string }> {
  // If antibot page, use the go target as working URL
  const goTarget = extractGoTarget(inputUrl);
  const firstUrl = goTarget || inputUrl;

  // Follow redirects to canonical URL
  const r = await fetch(firstUrl, {
    redirect: "follow",
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36",
      "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9",
    },
  });
  
  const finalUrl = r.url || firstUrl;
  let id = extractMlIdFromUrl(finalUrl);

  let html: string | undefined;
  if (!id) {
    html = await r.text();
    id = extractMlIdFromHtml(html);
  }
  
  return { id, finalUrl, html };
}

export async function scrapeMercadoLivre(url: string): Promise<ProductRaw> {
  const { id, finalUrl, html: preHtml } = await resolveIdAndFinalUrl(url);
  if (!id) throw new Error("MercadoLivre: não foi possível detectar o ID do anúncio");

  // Import async utilities
  const { withTimeout } = await import('../../../utils/async');

  let apiOk = false;
  let item: any | null = null;
  let pageHtml: string | null = preHtml || null;

  // 1. Tentar API primeiro (mais confiável)
  try {
    const apiRes = await withTimeout(
      fetch(`https://api.mercadolibre.com/items/${id}?include_attributes=all`, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          Accept: "application/json",
        },
      }), 
      7000, 
      "ml-api-7s"
    );
    
    if (apiRes.ok) {
      item = await apiRes.json();
      apiOk = true;
      console.log(`✅ ML API success for ${id}`);
    }
  } catch (apiError) {
    console.warn(`❌ ML API failed: ${apiError}`);
  }

  // 2. Se API falhou, tentar HTML
  if (!apiOk && !pageHtml) {
    try {
      const htmlRes = await withTimeout(
        fetch(finalUrl, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            "Accept": "text/html,application/xhtml+xml",
          },
        }), 
        7000, 
        "ml-html-7s"
      );
      
      if (htmlRes.ok) {
        pageHtml = await htmlRes.text();
        console.log(`✅ ML HTML fallback success for ${id}`);
      }
    } catch (htmlError) {
      console.warn(`❌ ML HTML failed: ${htmlError}`);
    }
  }

  // 3. ÚLTIMA TENTATIVA: Fetch simples sem timeout customizado
  if (!apiOk && !pageHtml) {
    try {
      const simpleRes = await fetch(finalUrl);
      if (simpleRes.ok) {
        pageHtml = await simpleRes.text();
        console.log(`✅ ML simple fetch worked for ${id}`);
      }
    } catch (finalError) {
      console.error(`❌ All ML methods failed for ${id}`);
      throw new Error(`MercadoLivre: Não foi possível coletar dados - todas as tentativas falharam`);
    }
  }

  let title: string = "Produto Mercado Livre";
  let imageUrl: string | null = null;
  let price: number | null = null;
  let brand: string | undefined;
  let gtin: string | undefined;
  let model: string | undefined;

  if (apiOk && item) {
    // API SUCCESS - extract data from JSON response
    const active = item?.status === "active";
    
    if (active && typeof item.price === "number" && item.price > 0) {
      price = Number(item.price.toFixed(2));
    }
    
    // Check for promotional prices
    const prices = item?.prices?.prices as any[] | undefined;
    if (active && prices?.length) {
      const now = Date.now();
      const promos = prices.filter(
        (p: any) =>
          p.type === "promotion" &&
          (!p.conditions?.start_time || Date.parse(p.conditions.start_time) <= now) &&
          (!p.conditions?.end_time || Date.parse(p.conditions.end_time) >= now) &&
          p.amount > 0
      );
      if (promos.length) {
        const best = promos.reduce((a: any, b: any) => (a.amount < b.amount ? a : b));
        price = Number(best.amount.toFixed(2));
      }
    }
    
    if (item?.title) title = item.title;
    imageUrl = item?.pictures?.[0]?.url || item?.thumbnail || null;

    // Extract attributes (GTIN, brand, model)
    const attrs = (item?.attributes || []) as any[];
    brand = attrs.find((a: any) => /brand/i.test(a.id) || /marca/i.test(a.name))?.value_name || undefined;
    gtin = attrs
      .find((a: any) => /gtin|ean|upc/i.test(a.id) || /gtin|ean|upc/i.test(a.name))
      ?.value_name?.replace(/\D/g, "") || undefined;
    model = attrs.find((a: any) => /model/i.test(a.id) || /modelo/i.test(a.name))?.value_name || undefined;
    
    // If status is not active, set price to null
    if (!active) {
      price = null;
    }
    
  } else if (!item && pageHtml) {
    // Use HTML parsing as fallback
    
    title = parseTitle(pageHtml);
    imageUrl = parseImage(pageHtml);
    price = parseJsonLdPrice(pageHtml); // Can be null if unavailable
    
    const attrs = parseAttributes(pageHtml);
    brand = attrs.brand; 
    gtin = attrs.gtin; 
    model = attrs.model;
  } else {
    // Neither API nor HTML succeeded, throw error
    throw new Error("MercadoLivre: failed to fetch both API and HTML");
  }

  // Logging para debug
  console.log(`ML fetch result - API: ${apiOk}, HTML: ${!!pageHtml}, Price: ${price}`);

  const quality = (price && (gtin || brand)) ? 'verified' : 'partial';

  return {
    url: finalUrl,
    domain: new URL(finalUrl).hostname.replace(/^www\./, ""),
    title: title.trim(),
    imageUrl,
    price,
    currency: "BRL",
    canonical: {
      gtin: gtin || null,
      asin: null,
      mpn: id,
      brand: brand || null,
      model: model || null,
    },
    quality,
  };
}
