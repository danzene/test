// Enhanced Mercado Livre ID extraction with antibot support

/**
 * Extract Mercado Livre ID from URL with antibot handling
 */
export function extractMlIdFromUrl(u: string): string | null {
  try {
    const url = new URL(u.trim());
    const host = url.hostname.toLowerCase();
    if (!/mercadolivre\.com\.br$/.test(host) && !/mercadolibre\./.test(host)) return null;

    // Handle antibot verification page
    if (url.pathname.startsWith("/gz/account-verification")) {
      const go = url.searchParams.get("go");
      if (go) {
        // Recursively extract from the target URL
        return extractMlIdFromUrl(decodeURIComponent(go));
      }
    }

    // Extract pattern MLX-<n> OR MLX<n> and normalize to MLXnnn
    const m = url.pathname.match(/(ML[A-Z])[-_]?(\d{3,})/i);
    if (!m) return null;
    return (m[1].toUpperCase() + m[2]); // normalize, remove hyphen
  } catch {
    return null;
  }
}

/**
 * Extract ML ID from HTML meta tags (og:url or canonical link)
 */
export function extractMlIdFromHtml(html: string): string | null {
  const og = html.match(/<meta[^>]+property=["']og:url["'][^>]+content=["']([^"']+)["']/i)?.[1];
  const canon = html.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i)?.[1];
  return extractMlIdFromUrl(og || canon || "");
}

/**
 * Extract the target URL from antibot verification page
 */
export function extractGoTarget(u: string): string | null {
  try {
    const url = new URL(u);
    if (!url.pathname.startsWith("/gz/account-verification")) return null;
    const go = url.searchParams.get("go");
    return go ? decodeURIComponent(go) : null;
  } catch { 
    return null; 
  }
}
