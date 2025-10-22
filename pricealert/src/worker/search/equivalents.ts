import { CanonicalIds, OfferResolved } from '@/shared/types';
import { MarketItem } from '@/types/product';
import { dedupeAndSort } from '@/utils/assert';
import { createSearchProvider } from './provider';
import { sameProduct, resolveCanonicalIds } from '../ingest/identity';
import { isAmazonBr, scrapeAmazonBr } from '../ingest/adapters/amazonBr';
import { isMercadoLivre, scrapeMercadoLivre } from '../ingest/adapters/mercadolivre';
import { isMagalu, scrapeMagalu } from '../ingest/adapters/magalu';
import { isKabum, scrapeKabum } from '../ingest/adapters/kabum';
import { scrapeUniversal } from '../ingest/adapters/universal';
import { domainPool, withRetry } from '../../utils/pool';
import { withTimeout } from '../../utils/async';
import { getCachedMarketSnapshot, setCachedMarketSnapshot } from '../../utils/cache';

export async function findEquivalentsStrict(
  env: any,
  originalCanonical: CanonicalIds,
  originalTitle: string,
  maxResults: number = 8
): Promise<{ items: OfferResolved[]; disabled?: boolean; partial?: boolean }> {
  
  // Check cache first
  const canonicalKey = `${originalCanonical.gtin || ''}:${originalCanonical.asin || ''}:${originalCanonical.brand || ''}:${originalCanonical.model || ''}`;
  const cached = getCachedMarketSnapshot(canonicalKey);
  if (cached && cached.length > 0) {
    const results = cached.slice(0, maxResults).map(item => ({
      productId: 0,
      title: '',
      price: item.price,
      currency: item.currency,
      domain: item.domain,
      sourceUrl: item.url,
      imageUrl: null,
      confidence: item.confidence,
    }));
    return { items: results };
  }
  
  const searchProvider = createSearchProvider(env);
  
  // If no SERP_API_KEY, return disabled state
  if (searchProvider.name === 'fallback' && !env.SERP_API_KEY) {
    return { items: [], disabled: true };
  }
  
  const seenUrls = new Set<string>();
  const marketItems: MarketItem[] = [];
  const startTime = Date.now();
  const BUDGET_MS = 8000; // Aumentar de 3.8s para 8s
  
  // Build search queries
  const queries = buildSearchQueries(originalCanonical, originalTitle);
  
  for (const query of queries) {
    let searchResults: string[] = [];
    
    try {
      console.log(`Searching: ${query}`);
      searchResults = await searchProvider.search(query);
      if (searchResults.length > 0) {
        console.log(`Found ${searchResults.length} results`);
      }
    } catch (error) {
      console.warn(`Search failed:`, error);
      continue;
    }
    
    // Process up to 6 results per query with time budget
    for (const url of searchResults.slice(0, 6)) {
      if (seenUrls.has(url)) continue;
      if (Date.now() - startTime > BUDGET_MS) break; // Time budget exceeded
      
      seenUrls.add(url);
      
      try {
        // Use domain pool and timeout for processing
        const offer = await domainPool(url, async () => {
          return await withRetry(async () => {
            return await withTimeout(
              processEquivalentUrl(url, originalCanonical, originalTitle),
              3000, // Aumentar de 1.5s para 3s
              "process-url-3s"
            );
          });
        });
        
        if (offer && offer.confidence >= 0.7 && offer.price && offer.price > 0) {
          marketItems.push({
            domain: offer.domain,
            url: offer.sourceUrl,
            price: offer.price,
            currency: offer.currency as "BRL",
            confidence: offer.confidence,
            collectedAt: new Date().toISOString(),
          });
        }
      } catch (error) {
        console.error(`Failed to process URL ${url}:`, error);
        continue;
      }
      
      if (marketItems.length >= maxResults) break; // Enough results for sync phase
    }
    
    if (Date.now() - startTime > BUDGET_MS || marketItems.length >= maxResults) break;
  }
  
  // Deduplicate and sort
  const dedupedItems = dedupeAndSort(marketItems).slice(0, maxResults);
  
  // Cache results for future requests
  if (dedupedItems.length > 0) {
    setCachedMarketSnapshot(canonicalKey, dedupedItems);
  }
  
  // Convert back to OfferResolved format
  const finalResults = dedupedItems.map(item => ({
    productId: 0,
    title: '', // Will be filled by the adapter when needed
    price: item.price,
    currency: item.currency,
    domain: item.domain,
    sourceUrl: item.url,
    imageUrl: null,
    confidence: item.confidence,
  }));
  
  const isPartial = finalResults.length < 3; // Less than 3 results indicates partial search
  
  // Logging para debug
  console.log(`Equivalents search - Found: ${marketItems.length}, Time: ${Date.now() - startTime}ms`);
  
  return { items: finalResults, partial: isPartial };
}

function buildSearchQueries(canonical: CanonicalIds, _title: string): string[] {
  const queries: string[] = [];
  const siteList = 'site:amazon.com.br OR site:mercadolivre.com.br OR site:magazineluiza.com.br OR site:kabum.com.br OR site:americanas.com.br OR site:shopee.com.br';
  
  // Strategy A: GTIN-based search (highest priority)
  if (canonical.gtin) {
    queries.push(`"${canonical.gtin}" (${siteList})`);
  }
  
  // Strategy B: Brand + Model search  
  if (canonical.brand && canonical.model) {
    queries.push(`"${canonical.brand} ${canonical.model}" (${siteList})`);
  }
  
  // Strategy C: Brand + MPN search
  if (canonical.brand && canonical.mpn) {
    queries.push(`"${canonical.brand}" "${canonical.mpn}" (${siteList})`);
  }
  
  // Strategy D: ASIN search (Amazon specific)
  if (canonical.asin) {
    queries.push(`"${canonical.asin}" site:amazon.com.br`);
  }
  
  return queries.filter(Boolean);
}

async function processEquivalentUrl(
  url: string,
  sourceCanonical: CanonicalIds,
  sourceTitle: string
): Promise<OfferResolved | null> {
  try {
    // Determine adapter based on domain
    let productData;
    
    if (isAmazonBr(url)) {
      productData = await scrapeAmazonBr(url);
    } else if (isMercadoLivre(url)) {
      productData = await scrapeMercadoLivre(url);
    } else if (isMagalu(url)) {
      productData = await scrapeMagalu(url);
    } else if (isKabum(url)) {
      productData = await scrapeKabum(url);
    } else {
      productData = await scrapeUniversal(url);
    }
    
    // Resolve canonical IDs for the candidate product
    const targetCanonical = resolveCanonicalIds(productData, url);
    const sourceIdentity = { canonical: sourceCanonical, confidence: 1.0 };
    const targetIdentity = { canonical: targetCanonical, confidence: 1.0 };
    
    // Check if it's the same product
    const matchResult = sameProduct(sourceIdentity, targetIdentity, sourceTitle, productData.title);
    if (!matchResult.ok) {
      return null;
    }
    
    // Only return if price is valid
    if (!productData.price || productData.price <= 0) {
      return null;
    }
    
    // Extract domain for display
    const domain = new URL(url).hostname.replace('www.', '');
    
    return {
      productId: 0, // Will be set when saved to database
      title: productData.title,
      price: productData.price,
      currency: productData.currency,
      domain,
      sourceUrl: url,
      imageUrl: productData.imageUrl,
      confidence: matchResult.confidence,
    };
  } catch (error) {
    console.error(`Failed to process equivalent URL ${url}:`, error);
    return null;
  }
}
