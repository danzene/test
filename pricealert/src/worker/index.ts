import { Hono } from "hono";
import { cors } from "hono/cors";
import { 
  getOAuthRedirectUrl,
  exchangeCodeForSessionToken,
  authMiddleware,
  deleteSession,
  getCurrentUser,
  MOCHA_SESSION_TOKEN_COOKIE_NAME,
} from "@getmocha/users-service/backend";
import { getCookie, setCookie } from "hono/cookie";
import { 
  IngestRequestSchema, 
  CreateAlertRequestSchema, 
  PLAN_LIMITS,
  Plan,
  PriceStats90d,
  CreateOfferItemRequestSchema,
  UpdateOfferItemRequestSchema,
} from "@/shared/types";

interface AppEnv extends Env {
  MOCHA_USERS_SERVICE_API_URL: string;
  MOCHA_USERS_SERVICE_API_KEY: string;
  GROQ_API_KEY?: string;
  PERPLEXITY_API_KEY?: string;
}

const app = new Hono<{ Bindings: AppEnv }>();

app.use("*", cors({
  origin: "*",
  allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowHeaders: ["Content-Type", "Authorization"],
  credentials: true,
}));

// Auth endpoints
app.get('/api/oauth/google/redirect_url', async (c) => {
  const redirectUrl = await getOAuthRedirectUrl('google', {
    apiUrl: c.env.MOCHA_USERS_SERVICE_API_URL,
    apiKey: c.env.MOCHA_USERS_SERVICE_API_KEY,
  });

  return c.json({ redirectUrl }, 200);
});

app.post("/api/sessions", async (c) => {
  const body = await c.req.json();

  if (!body.code) {
    return c.json({ error: "No authorization code provided" }, 400);
  }

  const sessionToken = await exchangeCodeForSessionToken(body.code, {
    apiUrl: c.env.MOCHA_USERS_SERVICE_API_URL,
    apiKey: c.env.MOCHA_USERS_SERVICE_API_KEY,
  });

  setCookie(c, MOCHA_SESSION_TOKEN_COOKIE_NAME, sessionToken, {
    httpOnly: true,
    path: "/",
    sameSite: "none",
    secure: true,
    maxAge: 60 * 24 * 60 * 60, // 60 days
  });

  return c.json({ success: true }, 200);
});

app.get("/api/users/me", authMiddleware, async (c) => {
  const mochaUser = c.get("user");
  
  if (!mochaUser) {
    return c.json({ error: "User not found" }, 401);
  }
  
  // Get or create user in our database
  let user = await c.env.DB.prepare(
    "SELECT * FROM users WHERE id = ?"
  ).bind(mochaUser.id).first();

  if (!user) {
    await c.env.DB.prepare(
      "INSERT INTO users (id, email, plan, created_at, updated_at) VALUES (?, ?, ?, ?, ?)"
    ).bind(
      mochaUser.id,
      mochaUser.email,
      'FREE',
      new Date().toISOString(),
      new Date().toISOString()
    ).run();

    user = await c.env.DB.prepare(
      "SELECT * FROM users WHERE id = ?"
    ).bind(mochaUser.id).first();
  }

  return c.json(user);
});

app.get('/api/logout', async (c) => {
  const sessionToken = getCookie(c, MOCHA_SESSION_TOKEN_COOKIE_NAME);

  if (typeof sessionToken === 'string') {
    await deleteSession(sessionToken, {
      apiUrl: c.env.MOCHA_USERS_SERVICE_API_URL,
      apiKey: c.env.MOCHA_USERS_SERVICE_API_KEY,
    });
  }

  setCookie(c, MOCHA_SESSION_TOKEN_COOKIE_NAME, '', {
    httpOnly: true,
    path: '/',
    sameSite: 'none',
    secure: true,
    maxAge: 0,
  });

  return c.json({ success: true }, 200);
});

// Real 90d stats calculation (no placeholders)
function computeRealStats90d(pricePoints: Array<{ price: number }>): PriceStats90d {
  const prices = pricePoints.map(p => p.price).filter(p => p > 0);
  
  if (prices.length === 0) {
    return { min: null, max: null, avg: null, changePct: 0 };
  }
  
  if (prices.length === 1) {
    const price = prices[0];
    return { min: price, max: price, avg: price, changePct: 0 };
  }
  
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const avg = Number((prices.reduce((sum, price) => sum + price, 0) / prices.length).toFixed(2));
  
  // Calculate change percentage from first to last price
  const firstPrice = prices[0];
  const lastPrice = prices[prices.length - 1];
  const changePct = firstPrice > 0 ? Number(((lastPrice - firstPrice) / firstPrice * 100).toFixed(1)) : 0;
  
  return { min, max, avg, changePct };
}

async function getMarketSnapshot(c: any, productId: number) {
  try {
    const result = await c.env.DB.prepare(`
      SELECT DISTINCT domain, url, price, currency, confidence, collected_at,
             ROW_NUMBER() OVER (PARTITION BY domain ORDER BY collected_at DESC) as rn
      FROM market_prices 
      WHERE product_id = ? AND price > 0
    `).bind(productId).all();
    
    // Filter to get only the latest entry per domain, sorted by price
    const latestPrices = (result.results || [])
      .filter((row: any) => row.rn === 1)
      .sort((a: any, b: any) => Number(a.price) - Number(b.price)); // ALWAYS sort by price ascending
    
    if (latestPrices.length === 0) {
      return {
        items: [],
        snapshotStats: { min: null, max: null, avg: null, stores: 0 },
        verified: false
      };
    }
    
    const prices = latestPrices.map((row: any) => Number(row.price));
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const avg = Number((prices.reduce((a: number, b: number) => a + b, 0) / prices.length).toFixed(2));
    
    // Check if we have verified data (GTIN-based matches)
    const hasVerified = latestPrices.some((row: any) => Number(row.confidence) >= 1.0);
    
    return {
      items: latestPrices.map((row: any) => ({
        domain: row.domain,
        url: row.url,
        price: Number(row.price),
        currency: row.currency,
        confidence: Number(row.confidence || 1.0),
        collected_at: row.collected_at,
      })),
      snapshotStats: { min, max, avg, stores: prices.length },
      verified: hasVerified
    };
  } catch (error) {
    console.error('Error getting market snapshot:', error);
    return {
      items: [],
      snapshotStats: { min: null, max: null, avg: null, stores: 0 },
      verified: false
    };
  }
}

// Remove old manual snapshot functions - now handled by queue system

// Check user limits
async function checkUserLimits(c: any, userId: string, action: 'search' | 'monitor') {
  const user = await c.env.DB.prepare(
    "SELECT plan FROM users WHERE id = ?"
  ).bind(userId).first();

  if (!user) {
    throw new Error('User not found');
  }

  const limits = PLAN_LIMITS[user.plan as Plan];
  
  if (action === 'search') {
    const today = new Date().toISOString().split('T')[0];
    const searchCount = await c.env.DB.prepare(
      "SELECT COUNT(*) as count FROM search_logs WHERE user_id = ? AND DATE(created_at) = ?"
    ).bind(userId, today).first();

    if (searchCount && searchCount.count >= limits.maxSearchesPerDay) {
      return { allowed: false, reason: 'Daily search limit exceeded' };
    }
  }

  if (action === 'monitor') {
    const monitorCount = await c.env.DB.prepare(
      "SELECT COUNT(*) as count FROM alerts WHERE user_id = ? AND is_active = 1"
    ).bind(userId).first();

    if (monitorCount && monitorCount.count >= limits.maxMonitoredItems) {
      return { allowed: false, reason: 'Maximum monitored items limit exceeded' };
    }
  }

  return { allowed: true };
}

// Log search activity
async function logSearch(c: any, userId: string | null, url: string, success: boolean) {
  await c.env.DB.prepare(
    "INSERT INTO search_logs (user_id, url, success, created_at, updated_at) VALUES (?, ?, ?, ?, ?)"
  ).bind(
    userId,
    url,
    success ? 1 : 0,
    new Date().toISOString(),
    new Date().toISOString()
  ).run();
}

// Domain extraction moved to ingest/index.ts

// Import ingestion system
import { ingestProduct, extractDomain as extractProductDomain } from './ingest/index';

// Remove unused snapshot queue (replaced by real-time search)

// Enhanced URL normalization utility
const STRIP_PARAMS = [/^utm_/i, /^mkt_/i, /^camp/i, /^aff/i, /^ref$/i, /^tag$/i, /^fbclid$/i, /^gclid$/i, /^sc$/i, /^s$/i, /^psc$/i];

function normalizeUrlRobust(url: string): string {
  try {
    const u = new URL(url.trim());
    
    // Remove tracking parameters
    STRIP_PARAMS.forEach(regex => {
      [...u.searchParams.keys()].forEach(key => {
        if (regex.test(key)) {
          u.searchParams.delete(key);
        }
      });
    });
    
    // Remove hash
    u.hash = '';
    
    // Remove trailing slash (except for root)
    u.pathname = u.pathname.replace(/\/+$/, '') || '/';
    
    // Normalize hostname (remove www)
    u.hostname = u.hostname.replace(/^www\./, '');
    
    return u.toString();
  } catch (error) {
    return url;
  }
}

// Enhanced hotfix v1.0.7: Universal URL ingestion with canonical deduplication
app.post("/api/ingest", authMiddleware, async (c) => {
  const user = c.get("user");
  if (!user) {
    return c.json({ ok: false, error: "User not found" }, 401);
  }
  
  const body = await c.req.json();
  
  let inputUrl: string;
  try {
    const validatedInput = IngestRequestSchema.parse(body);
    inputUrl = validatedInput.url;
  } catch (error) {
    return c.json({ ok: false, error: "Invalid URL format" }, 400);
  }
  
  // Check user limits
  const limitCheck = await checkUserLimits(c, user.id, 'search');
  if (!limitCheck.allowed) {
    return c.json({ ok: false, error: limitCheck.reason }, 429);
  }

  try {
    // 1) Normalize URL: remove www, hash, tracking params, trailing slashes
    const normalizedUrl = normalizeUrlRobust(inputUrl);
    
    // 2) Follow redirects to get final canonical URL
    let finalUrl = normalizedUrl;
    try {
      const redirectResponse = await fetch(normalizedUrl, { 
        method: 'HEAD',
        redirect: 'follow',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        }
      });
      if (redirectResponse.url) {
        finalUrl = normalizeUrlRobust(redirectResponse.url);
      }
    } catch (redirectError) {
      console.warn('Redirect resolution failed, using normalized URL:', redirectError);
    }

    // 3) Check if product already exists by final URL
    const existingByUrl = await c.env.DB.prepare(
      "SELECT * FROM products WHERE source_url = ?"
    ).bind(finalUrl).first();
    
    if (existingByUrl) {
      await logSearch(c, user.id, inputUrl, true);
      return c.json({ ok: true, productId: Number(existingByUrl.id) });
    }
    
    const now = new Date().toISOString();
    const domain = extractProductDomain(finalUrl);
    
    // 4) Run adapter to extract product data
    const productData = await ingestProduct(finalUrl);
    const canonical = productData.canonical;

    // ✅ NOVA VALIDAÇÃO: Rejeitar se não conseguiu extrair preço válido
    if (!productData.price || productData.price <= 0) {
      console.error(`⚠️ No valid price found for ${finalUrl}`);
      
      // Ainda assim criar o produto, mas marcar como "sem preço"
      await logSearch(c, user.id, inputUrl, false);
      
      return c.json({ 
        ok: false,
        error: "Não conseguimos extrair o preço deste produto no momento. Tente novamente em alguns minutos ou verifique se o link está correto.",
        details: {
          url: finalUrl,
          domain: extractProductDomain(finalUrl),
          title: productData.title || "Produto sem título",
        }
      }, 400);
    }

    // Só continua se price > 0

    // 5) Deduplicate by canonical IDs (GTIN priority, then ASIN)
    if (canonical.gtin) {
      const byGtin = await c.env.DB.prepare(
        "SELECT * FROM products WHERE canonical_gtin = ?"
      ).bind(canonical.gtin).first();
      
      if (byGtin) {
        // Update existing product with latest data
        await c.env.DB.prepare(
          `UPDATE products SET 
            last_price = ?, last_collected_at = ?, updated_at = ?,
            title = COALESCE(?, title), image_url = COALESCE(?, image_url)
          WHERE id = ?`
        ).bind(
          productData.price || byGtin.last_price,
          now,
          now,
          productData.title || null,
          productData.imageUrl || null,
          Number(byGtin.id)
        ).run();
        
        // Add price point if price changed
        if (productData.price && productData.price !== Number(byGtin.last_price)) {
          await c.env.DB.prepare(
            "INSERT INTO price_points (product_id, price, currency, captured_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)"
          ).bind(
            Number(byGtin.id),
            productData.price,
            productData.currency,
            now,
            now,
            now
          ).run();
        }
        
        await logSearch(c, user.id, inputUrl, true);
        return c.json({ ok: true, productId: Number(byGtin.id) });
      }
    }
    
    if (canonical.asin) {
      const byAsin = await c.env.DB.prepare(
        "SELECT * FROM products WHERE canonical_asin = ?"
      ).bind(canonical.asin).first();
      
      if (byAsin) {
        // Update existing product with latest data
        await c.env.DB.prepare(
          `UPDATE products SET 
            last_price = ?, last_collected_at = ?, updated_at = ?,
            title = COALESCE(?, title), image_url = COALESCE(?, image_url)
          WHERE id = ?`
        ).bind(
          productData.price || byAsin.last_price,
          now,
          now,
          productData.title || null,
          productData.imageUrl || null,
          Number(byAsin.id)
        ).run();
        
        // Add price point if price changed
        if (productData.price && productData.price !== Number(byAsin.last_price)) {
          await c.env.DB.prepare(
            "INSERT INTO price_points (product_id, price, currency, captured_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)"
          ).bind(
            Number(byAsin.id),
            productData.price,
            productData.currency,
            now,
            now,
            now
          ).run();
        }
        
        await logSearch(c, user.id, inputUrl, true);
        return c.json({ ok: true, productId: Number(byAsin.id) });
      }
    }

    // 6) Create new product with correct column mapping
    let productId: number;
    
    try {
      const result = await c.env.DB.prepare(
        `INSERT INTO products (
          source_url, domain, title, brand, sku, image_url, last_price, currency,
          canonical_gtin, canonical_asin, canonical_mpn, canonical_brand, model,
          verified, last_source, last_collected_at, data_quality, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(
        finalUrl,
        domain,
        productData.title || 'Produto',
        canonical.brand || null,
        null, // sku - not available in ProductRaw
        productData.imageUrl || null,
        productData.price || 0,
        'BRL',
        canonical.gtin || null,
        canonical.asin || null,
        canonical.mpn || null,
        canonical.brand || null, // Using canonical_brand column
        canonical.model || null,
        productData.quality === 'verified' ? 1 : 0,
        'adapter',
        now,
        productData.quality || 'partial',
        now,
        now
      ).run();
      
      productId = Number(result.meta.last_row_id);
    } catch (dbError: any) {
      // Handle concurrent creation collision
      if (dbError.message && dbError.message.includes('UNIQUE constraint failed')) {
        const existing = await c.env.DB.prepare(
          "SELECT * FROM products WHERE source_url = ?"
        ).bind(finalUrl).first();
        
        if (existing) {
          await logSearch(c, user.id, inputUrl, true);
          return c.json({ ok: true, productId: Number(existing.id) });
        }
      }
      
      throw dbError;
    }

    // CORRIGIR lógica de price point inicial
    const initialPrice = productData.price && productData.price > 0 ? productData.price : null;

    // IMPORTANTE: Só salvar se realmente tiver preço
    if (initialPrice !== null) {
      await c.env.DB.prepare(
        "INSERT INTO price_points (product_id, price, currency, captured_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)"
      ).bind(
        productId,
        initialPrice,
        productData.currency,
        now,
        now,
        now
      ).run();
    } else {
      // Marcar como coletado mesmo sem preço válido
      await c.env.DB.prepare(
        "UPDATE products SET last_collected_at = ?, updated_at = ? WHERE id = ?"
      ).bind(now, now, productId).run();
    }

    // Log successful search
    await logSearch(c, user.id, inputUrl, true);

    return c.json({ 
      ok: true, 
      productId: productId,
    });

  } catch (error) {
    await logSearch(c, user.id, inputUrl, false);
    console.error('Ingestion error:', error);
    
    // Return clear error message for debugging
    const errorMessage = error instanceof Error ? error.message : 'Failed to process product URL';
    
    return c.json({ 
      ok: false,
      error: errorMessage,
    }, 400);
  }
});

// NEW: Search for products by name (v2.0)
interface SearchProductsRequest {
  query: string; // Ex: "iPhone 15 Pro"
  maxResults?: number; // Default: 5
}

interface ProductSearchResult {
  id?: number;
  title: string;
  price: number;
  currency: string;
  domain: string;
  url: string;
  imageUrl?: string;
  confidence: number;
}

interface SearchProductsResponse {
  ok: boolean;
  query: string;
  results: ProductSearchResult[];
  totalFound: number;
  searchMethod: 'ai' | 'serp' | 'fallback';
  error?: string;
}

app.post("/api/search-products", authMiddleware, async (c) => {
  const user = c.get("user");
  if (!user) {
    return c.json({ ok: false, error: "User not found" }, 401);
  }

  const body = await c.req.json();
  const query = body.query?.trim();

  if (!query || query.length < 2) {
    return c.json({ 
      ok: false, 
      error: "Query must have at least 2 characters" 
    }, 400);
  }

  const limitCheck = await checkUserLimits(c, user.id, 'search');
  if (!limitCheck.allowed) {
    return c.json({ ok: false, error: limitCheck.reason }, 429);
  }

  try {
    const { hybridSearch } = await import('./search/hybrid-search');
    
    console.log(`🔍 Searching products: "${query}"`);
    
    const startTime = Date.now();
    const results = await hybridSearch(
      c.env.SERP_API_KEY || '', // Pode estar vazio - mock vai funcionar mesmo assim
      query,
      body.maxResults || 5
    );
    
    const duration = Date.now() - startTime;
    
    console.log(`✅ Search completed in ${duration}ms, found ${results.length} products`);
    
    if (results.length === 0) {
      return c.json({
        ok: true,
        query,
        results: [],
        totalFound: 0,
        warning: 'No products found. Try: "PlayStation 5", "Xbox Series X", or "iPhone 15 Pro"',
      });
    }

    await logSearch(c, user.id, query, true);
    
    return c.json({
      ok: true,
      query,
      results: results,
      totalFound: results.length,
    });

  } catch (error) {
    console.error('Search error:', error);
    await logSearch(c, user.id, query, false);
    
    return c.json({
      ok: false,
      error: error instanceof Error ? error.message : 'Search failed',
    }, 500);
  }
});

// Enhanced product details endpoint with real 90d stats
app.get("/api/product/:id", async (c) => {
  const productId = parseInt(c.req.param('id'));
  
  if (isNaN(productId)) {
    return c.json({ ok: false, error: "Invalid product ID" }, 400);
  }
  
  const product = await c.env.DB.prepare(
    "SELECT * FROM products WHERE id = ?"
  ).bind(productId).first();

  if (!product) {
    return c.json({ ok: false, error: "not_found" }, 404);
  }

  // Get real price points from last 90 days
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
  const pricePoints = await c.env.DB.prepare(
    "SELECT * FROM price_points WHERE product_id = ? AND captured_at >= ? ORDER BY captured_at ASC"
  ).bind(productId, ninetyDaysAgo).all();

  // Calculate real 90-day statistics (no placeholders)
  const realPricePoints = (pricePoints.results || []).map((p: any) => ({ price: Number(p.price) }));
  const stats90d = computeRealStats90d(realPricePoints);

  // Get equivalent products with confidence scores (legacy matches)
  const matchesData = await c.env.DB.prepare(
    `SELECT p.*, pm.confidence FROM products p 
     INNER JOIN product_matches pm ON p.id = pm.matched_product_id 
     WHERE pm.product_id = ? AND pm.confidence >= 0.7 
     ORDER BY pm.confidence DESC LIMIT 8`
  ).bind(productId).all();

  // Transform matches to OfferResolved format
  const matches = (matchesData.results || []).map((match: any) => ({
    productId: match.id,
    title: match.title,
    price: match.last_price,
    currency: match.currency || 'BRL',
    domain: match.domain,
    sourceUrl: match.source_url,
    imageUrl: match.image_url,
    confidence: match.confidence,
  }));

  // Get user alert if authenticated
  let userAlert = null;
  const sessionToken = getCookie(c, MOCHA_SESSION_TOKEN_COOKIE_NAME);
  if (sessionToken) {
    try {
      const mochaUser = await getCurrentUser(sessionToken, {
        apiUrl: c.env.MOCHA_USERS_SERVICE_API_URL || '',
        apiKey: c.env.MOCHA_USERS_SERVICE_API_KEY || '',
      });
      
      if (mochaUser) {
        userAlert = await c.env.DB.prepare(
          "SELECT * FROM alerts WHERE user_id = ? AND product_id = ? AND is_active = 1"
        ).bind(String((mochaUser as any).id), productId).first();
      }
    } catch (error) {
      // Ignore auth errors for public product view
    }
  }

  // Melhorar lógica de "collecting"
  const verified = Boolean(product.verified || product.canonical_gtin || product.canonical_asin);
  const collecting = !product.last_collected_at || (realPricePoints.length === 0 && Date.now() - new Date(String(product.created_at)).getTime() < 300000); // 5 min window
  
  const response = {
    ok: true,
    product,
    pricePoints: realPricePoints.length > 0 ? (pricePoints.results || []).map((p: any) => ({
      date: p.captured_at,
      price: Number(p.price)
    })) : [],
    matches,
    userAlert,
    collectedFrom: product.domain || 'unknown',
    collectedAt: product.last_collected_at,
    source: product.last_source || 'legacy',
    dataQuality: product.data_quality || 'partial',
    stats90d,
    verified,
    collecting, // Mostrar "coletando" se criado há menos de 5min E sem dados
    hasData: realPricePoints.length > 0, // NOVO: indicador explícito
  };

  return c.json(response);
});

// Enhanced market snapshot endpoint with real-time equivalents search
app.get("/api/product/:id/market", async (c) => {
  const productId = parseInt(c.req.param('id'));
  
  console.log('🔍 Market snapshot requested for product:', productId);
  console.log('  Environment check:');
  console.log('    GROQ_API_KEY:', !!c.env.GROQ_API_KEY ? '✅ configured' : '❌ missing');
  console.log('    SERP_API_KEY:', !!c.env.SERP_API_KEY ? '✅ configured' : '❌ missing');
  
  const product = await c.env.DB.prepare(
    "SELECT * FROM products WHERE id = ?"
  ).bind(productId).first();

  if (!product) {
    return c.json({ error: "Product not found" }, 404);
  }

  console.log('  Product:', String(product.title).substring(0, 50));

  try {
    // Import equivalents search
    const { findEquivalentsStrict } = await import('./search/equivalents');
    
    // Build canonical object with proper typing
    const canonical = {
      gtin: (product.canonical_gtin as string) || null,
      asin: (product.canonical_asin as string) || null, 
      mpn: (product.canonical_mpn as string) || null,
      brand: (product.canonical_brand as string) || (product.brand as string) || null,
      model: (product.model as string) || null,
    };
    
    console.log('  Canonical IDs:', {
      gtin: canonical.gtin ? '✅' : '❌',
      asin: canonical.asin ? '✅' : '❌',
      brand: canonical.brand ? '✅' : '❌',
      model: canonical.model ? '✅' : '❌',
    });
    
    // Find equivalent products across stores with 3.8s budget
    console.log('  Calling findEquivalentsStrict()...');
    const equivalentsResult = await findEquivalentsStrict(
      c.env,
      canonical,
      String(product.title || ''),
      8
    );
    
    console.log('  ✅ findEquivalentsStrict() completed:', {
      items: equivalentsResult.items.length,
      method: equivalentsResult.method,
      partial: equivalentsResult.partial,
      disabled: equivalentsResult.disabled
    });
    
    if (equivalentsResult.disabled) {
      return c.json({
        items: [],
        snapshotStats: { min: null, max: null, avg: null, stores: 0 },
        verified: Boolean(product.verified || product.canonical_gtin || product.canonical_asin),
        disabled: true
      });
    }
    
    const items = equivalentsResult.items;
    
    // Calculate stats from real results
    let snapshotStats: { min: number | null; max: number | null; avg: number | null; stores: number } = { 
      min: null, 
      max: null, 
      avg: null, 
      stores: 0 
    };
    
    if (items.length > 0) {
      const prices = items.map(item => item.price).filter((p): p is number => p != null && p > 0);
      if (prices.length > 0) {
        snapshotStats = {
          min: Math.min(...prices),
          max: Math.max(...prices),
          avg: Number((prices.reduce((a, b) => a + b, 0) / prices.length).toFixed(2)),
          stores: items.length
        };
      }
    }
    
    const response = {
      items: items.map(item => ({
        domain: item.domain,
        url: item.sourceUrl,
        price: item.price,
        currency: item.currency,
        confidence: item.confidence,
        collected_at: new Date().toISOString(),
      })),
      snapshotStats,
      verified: Boolean(product.verified || product.canonical_gtin || product.canonical_asin),
      partial: equivalentsResult.partial || false, // Indicate if this is a partial result
    };
    
    return c.json(response);
    
  } catch (error) {
    console.error('Market snapshot error:', error);
    
    // Fallback to existing market_prices data
    const marketSnapshot = await getMarketSnapshot(c, productId);
    return c.json(marketSnapshot);
  }
});

// Create price alert
app.post("/api/alerts", authMiddleware, async (c) => {
  const user = c.get("user");
  if (!user) {
    return c.json({ error: "User not found" }, 401);
  }
  
  const body = await c.req.json();
  
  const validatedInput = CreateAlertRequestSchema.parse(body);
  
  // Check user limits
  const limitCheck = await checkUserLimits(c, user.id, 'monitor');
  if (!limitCheck.allowed) {
    return c.json({ error: limitCheck.reason }, 429);
  }

  // Get user plan to check WhatsApp permission
  const userData = await c.env.DB.prepare(
    "SELECT plan FROM users WHERE id = ?"
  ).bind(user.id).first();

  if (!userData) {
    return c.json({ error: "User not found" }, 404);
  }

  const limits = PLAN_LIMITS[userData.plan as Plan];
  
  // Filter out WhatsApp if not allowed
  const allowedChannels = validatedInput.channels.filter(channel => 
    channel === 'email' || (channel === 'whatsapp' && limits.canUseWhatsApp)
  );

  if (allowedChannels.length === 0) {
    return c.json({ error: "No valid channels available for your plan" }, 400);
  }

  // Deactivate existing alerts for this product and user
  await c.env.DB.prepare(
    "UPDATE alerts SET is_active = 0, updated_at = ? WHERE user_id = ? AND product_id = ?"
  ).bind(
    new Date().toISOString(),
    user.id,
    validatedInput.productId
  ).run();

  // Create new alert
  await c.env.DB.prepare(
    "INSERT INTO alerts (user_id, product_id, target_price, channels, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
  ).bind(
    user.id,
    validatedInput.productId,
    validatedInput.targetPrice,
    JSON.stringify(allowedChannels),
    1,
    new Date().toISOString(),
    new Date().toISOString()
  ).run();

  return c.json({ success: true });
});

// Get user limits and usage
app.get("/api/me/limits", authMiddleware, async (c) => {
  const user = c.get("user");
  if (!user) {
    return c.json({ error: "User not found" }, 401);
  }
  
  const userData = await c.env.DB.prepare(
    "SELECT plan FROM users WHERE id = ?"
  ).bind(user.id).first();

  if (!userData) {
    return c.json({ error: "User not found" }, 404);
  }

  const limits = PLAN_LIMITS[userData.plan as Plan];

  // Get current usage
  const today = new Date().toISOString().split('T')[0];
  const [monitoredCount, searchCount] = await Promise.all([
    c.env.DB.prepare(
      "SELECT COUNT(*) as count FROM alerts WHERE user_id = ? AND is_active = 1"
    ).bind(user.id).first(),
    c.env.DB.prepare(
      "SELECT COUNT(*) as count FROM search_logs WHERE user_id = ? AND DATE(created_at) = ?"
    ).bind(user.id, today).first()
  ]);

  return c.json({
    plan: userData.plan,
    limits,
    usage: {
      monitoredItems: monitoredCount?.count || 0,
      searchesToday: searchCount?.count || 0,
    },
  });
});

// Analytics endpoint 
app.post("/api/analytics", async (c) => {
  const body = await c.req.json();
  const sessionToken = getCookie(c, MOCHA_SESSION_TOKEN_COOKIE_NAME);
  
  let userId = null;
  if (sessionToken) {
    try {
      const mochaUser = await getCurrentUser(sessionToken, {
        apiUrl: c.env.MOCHA_USERS_SERVICE_API_URL || '',
        apiKey: c.env.MOCHA_USERS_SERVICE_API_KEY || '',
      });
      userId = (mochaUser as any)?.id ? String((mochaUser as any).id) : null;
    } catch (error) {
      // Anonymous analytics are fine
    }
  }

  try {
    await c.env.DB.prepare(
      "INSERT INTO analytics_events (user_id, event_name, event_data, created_at, updated_at) VALUES (?, ?, ?, ?, ?)"
    ).bind(
      userId,
      String(body.eventName || ''),
      JSON.stringify(body.eventData || {}),
      new Date().toISOString(),
      new Date().toISOString()
    ).run();

    return c.json({ success: true });
  } catch (error) {
    return c.json({ error: "Failed to track event" }, 500);
  }
});

// Feedback endpoint 
app.post("/api/feedback", authMiddleware, async (c) => {
  const user = c.get("user");
  if (!user) {
    return c.json({ error: "User not found" }, 401);
  }

  const body = await c.req.json();

  if (!body.type || !body.message) {
    return c.json({ error: "Type and message are required" }, 400);
  }

  const validTypes = ['bug', 'feature', 'general'];
  if (!validTypes.includes(body.type)) {
    return c.json({ error: "Invalid feedback type" }, 400);
  }

  try {
    await c.env.DB.prepare(
      "INSERT INTO feedback (user_id, type, message, rating, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)"
    ).bind(
      user.id,
      body.type,
      body.message,
      body.rating || null,
      new Date().toISOString(),
      new Date().toISOString()
    ).run();

    return c.json({ success: true });
  } catch (error) {
    return c.json({ error: "Failed to save feedback" }, 500);
  }
});

// Delete alert endpoint 
app.delete("/api/alerts/:id", authMiddleware, async (c) => {
  const user = c.get("user");
  if (!user) {
    return c.json({ error: "User not found" }, 401);
  }

  const alertId = parseInt(c.req.param('id'));
  
  // Verify the alert belongs to the user
  const alert = await c.env.DB.prepare(
    "SELECT id FROM alerts WHERE id = ? AND user_id = ?"
  ).bind(alertId, user.id).first();

  if (!alert) {
    return c.json({ error: "Alert not found" }, 404);
  }

  // Deactivate the alert
  await c.env.DB.prepare(
    "UPDATE alerts SET is_active = 0, updated_at = ? WHERE id = ?"
  ).bind(new Date().toISOString(), alertId).run();

  return c.json({ success: true });
});

// Internal reprocess endpoint (removed from public API - everything is automatic now)
// Products are automatically updated on each view/ingest

// Health check endpoint (v1.0.8)
app.get("/api/health", async (c) => {
  return c.json({
    status: "healthy",
    version: "1.0.8-serp",
    timestamp: new Date().toISOString(),
    features: [
      "universal_url_ingestion",
      "canonical_deduplication",
      "real_time_market_search", 
      "robust_adapters",
      "enhanced_price_parsing",
      "parallel_fetching",
      "timeout_protection",
      "domain_pool_limiting",
      "performance_cache",
      "instant_price_points",
      "groq_ai_integration",
      "serp_api_integration",
      "hybrid_product_search"
    ],
    search_providers: {
      groq: !!c.env.GROQ_API_KEY,
      perplexity: !!c.env.PERPLEXITY_API_KEY,
      serp_api: !!c.env.SERP_API_KEY
    }
  });
});

// Debug endpoint 1: Quick Groq check
app.get("/api/debug/groq-check", async (c) => {
  const apiKey = c.env.GROQ_API_KEY;
  
  return c.json({
    exists: !!apiKey,
    length: apiKey?.length || 0,
    prefix: apiKey ? `${apiKey.substring(0, 20)}...` : 'none',
    suffix: apiKey ? `...${apiKey.substring(apiKey.length - 10)}` : 'none',
    format_ok: apiKey ? apiKey.startsWith('gsk_') && apiKey.length === 56 : false,
    env_check: {
      GROQ_API_KEY: !!apiKey,
      PERPLEXITY_API_KEY: !!c.env.PERPLEXITY_API_KEY,
      SERP_API_KEY: !!c.env.SERP_API_KEY,
    }
  });
});

// Debug endpoint 2: Test Groq API directly
app.get("/api/debug/groq-test", async (c) => {
  console.log('🧪 Testing Groq API...');
  
  const apiKey = c.env.GROQ_API_KEY;
  
  console.log('  GROQ_API_KEY exists:', !!apiKey);
  console.log('  GROQ_API_KEY length:', apiKey?.length || 0);
  console.log('  GROQ_API_KEY preview:', apiKey ? `${apiKey.substring(0, 20)}...` : 'none');
  
  if (!apiKey) {
    return c.json({ 
      ok: false,
      error: 'GROQ_API_KEY not configured',
      env_check: {
        GROQ_API_KEY: false,
        PERPLEXITY_API_KEY: !!c.env.PERPLEXITY_API_KEY,
        SERP_API_KEY: !!c.env.SERP_API_KEY,
      }
    }, 400);
  }
  
  try {
    console.log('  Calling Groq API...');
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.1-70b-versatile',
        messages: [
          {
            role: 'user',
            content: 'Say "Groq AI is working for PriceAlert+" - be brief'
          }
        ],
        temperature: 0.1,
        max_tokens: 15,
      }),
    });

    console.log('  Groq API status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('  Groq API error:', errorText);
      return c.json({
        ok: false,
        status: response.status,
        error: errorText,
        full_response: errorText,
      }, 500);
    }
    
    const data = await response.json() as any;
    console.log('  ✅ Groq API success');
    
    return c.json({
      ok: true,
      status: response.status,
      success: true,
      message: data.choices?.[0]?.message?.content || 'No response',
      model: 'llama-3.1-70b-versatile',
      groq_response: data
    });
  } catch (error) {
    console.error('  ❌ Groq test failed:', error);
    return c.json({
      ok: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      type: error instanceof Error ? error.constructor.name : typeof error,
      stack: error instanceof Error ? error.stack : undefined
    }, 500);
  }
});

// New debug endpoint: Quick Groq check
app.get("/api/debug/groq-check", async (c) => {
  const apiKey = c.env.GROQ_API_KEY;
  
  return c.json({
    exists: !!apiKey,
    length: apiKey?.length || 0,
    prefix: apiKey ? `${apiKey.substring(0, 10)}...` : 'none',
    format_ok: apiKey ? apiKey.startsWith('gsk_') && apiKey.length === 56 : false,
    env_check: {
      GROQ_API_KEY: !!apiKey,
      PERPLEXITY_API_KEY: !!c.env.PERPLEXITY_API_KEY,
      SERP_API_KEY: !!c.env.SERP_API_KEY,
    }
  });
});

// New debug endpoint: Test SerpAPI
app.get("/api/debug/serp-test", async (c) => {
  const query = c.req.query('q') || 'iPhone 15';
  const apiKey = c.env.SERP_API_KEY;
  
  const { testSerpAPI } = await import('./debug/serp-test');
  const result = await testSerpAPI(apiKey, query);
  
  return c.json(result);
});

// New debug endpoint: Test real product search
app.get("/api/debug/groq-product-test", async (c) => {
  const apiKey = c.env.GROQ_API_KEY;
  
  if (!apiKey) {
    return c.json({ error: 'GROQ_API_KEY not configured' }, 400);
  }

  try {
    console.log('🧪 Testing Groq product search...');
    
    // Test with a real product scenario
    const testCanonical = {
      gtin: null,
      asin: 'B0DGT89KW1',
      mpn: null,
      brand: null,
      model: null,
    };
    const testTitle = 'Quebrando o gelo - Suce';
    
    const { GroqSearchProvider } = await import('./search/ai-provider');
    const provider = new GroqSearchProvider(apiKey);
    
    console.log('  Testing with:', { testTitle, testCanonical });
    
    const result = await provider.searchProduct(testCanonical, testTitle);
    
    console.log('  ✅ Groq product search completed:', {
      urls_found: result.urls.length,
      confidence: result.confidence
    });
    
    return c.json({
      ok: true,
      test_input: { testTitle, testCanonical },
      result: {
        urls_count: result.urls.length,
        urls: result.urls,
        confidence: result.confidence,
        reasoning_preview: result.reasoning?.substring(0, 200) + '...' || 'none'
      },
      message: 'Groq product search is working!'
    });
  } catch (error) {
    console.error('  ❌ Groq product test failed:', error);
    return c.json({
      ok: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      type: error instanceof Error ? error.constructor.name : typeof error
    }, 500);
  }
});

// User preferences endpoints 
app.get("/api/me/preferences", authMiddleware, async (c) => {
  const user = c.get("user");
  if (!user) {
    return c.json({ error: "User not found" }, 401);
  }

  let preferences = await c.env.DB.prepare(
    "SELECT * FROM user_preferences WHERE user_id = ?"
  ).bind(user.id).first();

  if (!preferences) {
    // Create default preferences
    await c.env.DB.prepare(
      "INSERT INTO user_preferences (user_id, email_notifications, whatsapp_notifications, price_drop_threshold, notification_frequency, timezone, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
    ).bind(
      user.id,
      true,
      true,
      0.05,
      'immediate',
      'America/Sao_Paulo',
      new Date().toISOString(),
      new Date().toISOString()
    ).run();

    preferences = await c.env.DB.prepare(
      "SELECT * FROM user_preferences WHERE user_id = ?"
    ).bind(user.id).first();
  }

  return c.json(preferences);
});

app.put("/api/me/preferences", authMiddleware, async (c) => {
  const user = c.get("user");
  if (!user) {
    return c.json({ error: "User not found" }, 401);
  }

  const body = await c.req.json();

  try {
    await c.env.DB.prepare(
      "UPDATE user_preferences SET email_notifications = ?, whatsapp_notifications = ?, price_drop_threshold = ?, notification_frequency = ?, timezone = ?, updated_at = ? WHERE user_id = ?"
    ).bind(
      body.email_notifications ?? true,
      body.whatsapp_notifications ?? true,
      body.price_drop_threshold ?? 0.05,
      body.notification_frequency ?? 'immediate',
      body.timezone ?? 'America/Sao_Paulo',
      new Date().toISOString(),
      user.id
    ).run();

    return c.json({ success: true });
  } catch (error) {
    return c.json({ error: "Failed to update preferences" }, 500);
  }
});

// Wishlist endpoints 
app.get("/api/me/wishlist", authMiddleware, async (c) => {
  const user = c.get("user");
  if (!user) {
    return c.json({ error: "User not found" }, 401);
  }

  const wishlistItems = await c.env.DB.prepare(
    "SELECT p.*, w.notes as wishlist_notes, w.created_at as wishlist_added_at FROM products p INNER JOIN wishlists w ON p.id = w.product_id WHERE w.user_id = ? ORDER BY w.created_at DESC"
  ).bind(user.id).all();

  return c.json({
    items: wishlistItems.results || [],
  });
});

app.post("/api/wishlist/:id", authMiddleware, async (c) => {
  const user = c.get("user");
  if (!user) {
    return c.json({ error: "User not found" }, 401);
  }

  const productId = parseInt(c.req.param('id'));
  const body = await c.req.json();

  // Check user plan limits
  const userData = await c.env.DB.prepare(
    "SELECT plan FROM users WHERE id = ?"
  ).bind(user.id).first();

  if (!userData) {
    return c.json({ error: "User not found" }, 404);
  }

  const limits = PLAN_LIMITS[userData.plan as Plan];
  const wishlistCount = await c.env.DB.prepare(
    "SELECT COUNT(*) as count FROM wishlists WHERE user_id = ?"
  ).bind(user.id).first();

  if (wishlistCount && (wishlistCount as any).count >= limits.maxWishlistItems) {
    return c.json({ error: "Wishlist limit exceeded for your plan" }, 429);
  }

  // Check if product exists
  const product = await c.env.DB.prepare(
    "SELECT id FROM products WHERE id = ?"
  ).bind(productId).first();

  if (!product) {
    return c.json({ error: "Product not found" }, 404);
  }

  try {
    await c.env.DB.prepare(
      "INSERT OR REPLACE INTO wishlists (user_id, product_id, notes, created_at, updated_at) VALUES (?, ?, ?, ?, ?)"
    ).bind(
      user.id,
      productId,
      body.notes || null,
      new Date().toISOString(),
      new Date().toISOString()
    ).run();

    return c.json({ success: true });
  } catch (error) {
    return c.json({ error: "Failed to add to wishlist" }, 500);
  }
});

app.delete("/api/wishlist/:id", authMiddleware, async (c) => {
  const user = c.get("user");
  if (!user) {
    return c.json({ error: "User not found" }, 401);
  }

  const productId = parseInt(c.req.param('id'));

  try {
    await c.env.DB.prepare(
      "DELETE FROM wishlists WHERE user_id = ? AND product_id = ?"
    ).bind(user.id, productId).run();

    return c.json({ success: true });
  } catch (error) {
    return c.json({ error: "Failed to remove from wishlist" }, 500);
  }
});

// Enhanced dashboard with alert history 
app.get("/api/me/dashboard", authMiddleware, async (c) => {
  const user = c.get("user");
  if (!user) {
    return c.json({ error: "User not found" }, 401);
  }
  
  const [alerts, alertHistory, wishlistCountResult] = await Promise.all([
    c.env.DB.prepare(
      "SELECT a.*, p.title, p.image_url, p.last_price, p.domain FROM alerts a INNER JOIN products p ON a.product_id = p.id WHERE a.user_id = ? AND a.is_active = 1 ORDER BY a.created_at DESC"
    ).bind(user.id).all(),
    c.env.DB.prepare(
      "SELECT ah.*, p.title, p.image_url, p.domain FROM alert_history ah INNER JOIN products p ON ah.product_id = p.id WHERE ah.user_id = ? ORDER BY ah.created_at DESC LIMIT 20"
    ).bind(user.id).all(),
    c.env.DB.prepare(
      "SELECT COUNT(*) as count FROM wishlists WHERE user_id = ?"
    ).bind(user.id).first()
  ]);

  const wishlistCount = wishlistCountResult ? Number(String((wishlistCountResult as any).count || 0)) : 0;

  return c.json({
    alerts: alerts.results || [],
    alertHistory: alertHistory.results || [],
    wishlistCount,
  });
});

// Check if product is in wishlist 
app.get("/api/wishlist/check/:id", authMiddleware, async (c) => {
  const user = c.get("user");
  if (!user) {
    return c.json({ inWishlist: false });
  }

  const productId = parseInt(c.req.param('id'));
  const wishlistItem = await c.env.DB.prepare(
    "SELECT id FROM wishlists WHERE user_id = ? AND product_id = ?"
  ).bind(user.id, productId).first();

  return c.json({
    inWishlist: !!wishlistItem,
  });
});

// Admin middleware
const adminMiddleware = async (c: any, next: any) => {
  // First check if user is authenticated
  const sessionToken = getCookie(c, MOCHA_SESSION_TOKEN_COOKIE_NAME);
  if (!sessionToken) {
    return c.json({ error: "Authentication required" }, 401);
  }

  try {
    const mochaUser = await getCurrentUser(sessionToken, {
      apiUrl: c.env.MOCHA_USERS_SERVICE_API_URL || '',
      apiKey: c.env.MOCHA_USERS_SERVICE_API_KEY || '',
    });
    
    if (!mochaUser) {
      return c.json({ error: "User not found" }, 401);
    }

    // Get user from our database to check role
    const user = await c.env.DB.prepare(
      "SELECT * FROM users WHERE id = ?"
    ).bind((mochaUser as any).id).first();

    // For now, we'll hardcode admin access based on user ID
    // In a real deployment, you would add the role column or use a separate admin table
    const adminUserIds = ['admin-user-id']; // Replace with actual admin user IDs
    const isAdmin = adminUserIds.includes((mochaUser as any).id);
    
    if (!user || !isAdmin) {
      return c.json({ error: "Admin access required" }, 403);
    }

    // Set user context
    c.set('user', mochaUser);
    
    await next();
  } catch (error) {
    return c.json({ error: "Authentication failed" }, 401);
  }
};

// Admin Stats endpoint
app.get("/api/admin/stats", adminMiddleware, async (c) => {
  try {
    const [offersResult, usersResult, analyticsResult] = await Promise.all([
      c.env.DB.prepare("SELECT COUNT(*) as total, SUM(CASE WHEN active = 1 THEN 1 ELSE 0 END) as active FROM offer_items").first(),
      c.env.DB.prepare("SELECT COUNT(*) as total, SUM(CASE WHEN DATE(created_at) = DATE('now') THEN 1 ELSE 0 END) as today FROM users").first(),
      c.env.DB.prepare("SELECT COUNT(*) as total, SUM(CASE WHEN DATE(created_at) = DATE('now') THEN 1 ELSE 0 END) as today FROM analytics_events WHERE event_name = 'page_view'").first(),
    ]);

    const stats = {
      totalOffers: offersResult?.total || 0,
      activeOffers: offersResult?.active || 0,
      totalUsers: usersResult?.total || 0,
      todaySignups: usersResult?.today || 0,
      totalRevenue: 0, // TODO: Implement revenue tracking
      monthlyRevenue: 0, // TODO: Implement revenue tracking
      totalPageViews: analyticsResult?.total || 0,
      todayPageViews: analyticsResult?.today || 0,
    };

    return c.json(stats);
  } catch (error) {
    console.error('Error fetching admin stats:', error);
    return c.json({ error: "Failed to fetch stats" }, 500);
  }
});

// Admin Offers CRUD endpoints
app.get("/api/admin/offers", adminMiddleware, async (c) => {
  try {
    const query = c.req.query('query') || '';
    const active = c.req.query('active') || 'all';
    const category = c.req.query('category') || 'all';
    const domain = c.req.query('domain') || 'all';
    
    let sql = "SELECT * FROM offer_items WHERE 1=1";
    const params: any[] = [];
    
    if (query) {
      sql += " AND (title LIKE ? OR store LIKE ?)";
      params.push(`%${query}%`, `%${query}%`);
    }
    
    if (active !== 'all') {
      sql += " AND active = ?";
      params.push(active === 'true' ? 1 : 0);
    }
    
    if (category !== 'all') {
      sql += " AND category = ?";
      params.push(category);
    }
    
    if (domain !== 'all') {
      sql += " AND domain = ?";
      params.push(domain);
    }
    
    sql += " ORDER BY pinned DESC, created_at DESC";
    
    const result = await c.env.DB.prepare(sql).bind(...params).all();
    
    const items = (result.results || []).map((item: any) => ({
      ...item,
      id: item.id.toString(),
      tags: item.tags ? JSON.parse(item.tags) : [],
      active: Boolean(item.active),
      pinned: Boolean(item.pinned),
    }));
    
    return c.json({ items });
  } catch (error) {
    console.error('Error fetching offers:', error);
    return c.json({ error: "Failed to fetch offers" }, 500);
  }
});

app.post("/api/admin/offers", adminMiddleware, async (c) => {
  try {
    const body = await c.req.json();
    const validatedData = CreateOfferItemRequestSchema.parse(body);
    const mochaUser = c.get('user');
    const user = await c.env.DB.prepare(
      "SELECT * FROM users WHERE id = ?"
    ).bind((mochaUser as any).id).first();

    if (!user) {
      return c.json({ error: "User not found in database" }, 404);
    }
    
    const now = new Date().toISOString();
    const tags = JSON.stringify(validatedData.tags || []);
    
    const result = await c.env.DB.prepare(`
      INSERT INTO offer_items (
        title, store, domain, image_url, url, price, currency, drop_pct, 
        category, tags, active, pinned, expires_at, created_by, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      validatedData.title,
      validatedData.store,
      validatedData.domain || '',
      validatedData.image_url || null,
      validatedData.url,
      validatedData.price || null,
      validatedData.currency,
      validatedData.drop_pct || null,
      validatedData.category || null,
      tags,
      validatedData.active ? 1 : 0,
      validatedData.pinned ? 1 : 0,
      validatedData.expires_at || null,
      user.id,
      now,
      now
    ).run();
    
    return c.json({ 
      success: true, 
      id: result.meta.last_row_id?.toString() 
    });
  } catch (error) {
    console.error('Error creating offer:', error);
    return c.json({ 
      error: error instanceof Error ? error.message : "Failed to create offer" 
    }, 400);
  }
});

app.patch("/api/admin/offers/:id", adminMiddleware, async (c) => {
  try {
    const offerId = c.req.param('id');
    const body = await c.req.json();
    const validatedData = UpdateOfferItemRequestSchema.parse(body);
    
    // Build dynamic update query
    const updates: string[] = [];
    const params: any[] = [];
    
    Object.entries(validatedData).forEach(([key, value]) => {
      if (value !== undefined) {
        if (key === 'tags') {
          updates.push('tags = ?');
          params.push(JSON.stringify(value));
        } else if (key === 'active' || key === 'pinned') {
          updates.push(`${key} = ?`);
          params.push(value ? 1 : 0);
        } else {
          updates.push(`${key} = ?`);
          params.push(value);
        }
      }
    });
    
    if (updates.length === 0) {
      return c.json({ error: "No fields to update" }, 400);
    }
    
    updates.push('updated_at = ?');
    params.push(new Date().toISOString());
    params.push(offerId);
    
    const sql = `UPDATE offer_items SET ${updates.join(', ')} WHERE id = ?`;
    
    const result = await c.env.DB.prepare(sql).bind(...params).run();
    
    if (result.meta.changes === 0) {
      return c.json({ error: "Offer not found" }, 404);
    }
    
    return c.json({ success: true });
  } catch (error) {
    console.error('Error updating offer:', error);
    return c.json({ 
      error: error instanceof Error ? error.message : "Failed to update offer" 
    }, 400);
  }
});

app.delete("/api/admin/offers/:id", adminMiddleware, async (c) => {
  try {
    const offerId = c.req.param('id');
    
    const result = await c.env.DB.prepare("DELETE FROM offer_items WHERE id = ?").bind(offerId).run();
    
    if (result.meta.changes === 0) {
      return c.json({ error: "Offer not found" }, 404);
    }
    
    return c.json({ success: true });
  } catch (error) {
    console.error('Error deleting offer:', error);
    return c.json({ error: "Failed to delete offer" }, 500);
  }
});

// Update public offers endpoint to use database instead of mock data
app.get("/api/offers", async (c) => {
  try {
    const store = c.req.query('store') || 'all';
    const category = c.req.query('category') || 'all';
    const minDrop = c.req.query('minDrop') ? parseFloat(c.req.query('minDrop')!) : null;
    const minPrice = c.req.query('minPrice') ? parseFloat(c.req.query('minPrice')!) : null;
    const maxPrice = c.req.query('maxPrice') ? parseFloat(c.req.query('maxPrice')!) : null;
    
    let sql = "SELECT * FROM offer_items WHERE active = 1 AND (expires_at IS NULL OR expires_at > datetime('now'))";
    const params: any[] = [];
    
    if (store !== 'all') {
      sql += " AND store = ?";
      params.push(store);
    }
    
    if (category !== 'all') {
      sql += " AND category = ?";
      params.push(category);
    }
    
    if (minDrop !== null) {
      sql += " AND drop_pct >= ?";
      params.push(minDrop);
    }
    
    if (minPrice !== null) {
      sql += " AND price >= ?";
      params.push(minPrice);
    }
    
    if (maxPrice !== null) {
      sql += " AND price <= ?";
      params.push(maxPrice);
    }
    
    sql += " ORDER BY pinned DESC, created_at DESC LIMIT 50";
    
    const result = await c.env.DB.prepare(sql).bind(...params).all();
    
    const items = (result.results || []).map((item: any) => ({
      ...item,
      id: item.id.toString(),
      tags: item.tags ? JSON.parse(item.tags) : [],
      active: Boolean(item.active),
      pinned: Boolean(item.pinned),
    }));
    
    return c.json({ items });
  } catch (error) {
    console.error('Error fetching public offers:', error);
    return c.json({ error: "Failed to fetch offers" }, 500);
  }
});

export default app;
