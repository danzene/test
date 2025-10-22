// src/worker/search/equivalents.ts
import { CanonicalIds, OfferResolved } from '@/shared/types';
import { MarketItem } from '@/types/product';
import { dedupeAndSort } from '@/utils/assert';
import { createAISearchProvider } from './ai-provider';
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
): Promise<{ items: OfferResolved[]; disabled?: boolean; partial?: boolean; method?: string }> {
  
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
    return { items: results, method: 'cache' };
  }
  
  const seenUrls = new Set<string>();
  const marketItems: MarketItem[] = [];
  const startTime = Date.now();
  const BUDGET_MS = 8000;
  
  let searchUrls: string[] = [];
  let searchMethod = 'none';
  
  // PRIORIDADE 1: IA (Groq/Perplexity) - GRATUITO
  const aiProvider = createAISearchProvider(env);
  if (aiProvider) {
    try {
      console.log('🤖 Usando IA para buscar produtos...');
      const aiResult = await withTimeout(
        aiProvider.searchProduct(originalCanonical, originalTitle),
        5000,
        'ai-search-timeout'
      );
      
      if (aiResult.urls.length > 0) {
        searchUrls = aiResult.urls;
        searchMethod = 'ai';
        console.log(`✅ IA encontrou ${searchUrls.length} URLs`);
      }
    } catch (error) {
      console.warn('⚠️ IA falhou, usando fallback:', error);
    }
  }
  
  // PRIORIDADE 2: SERP API (fallback)
  if (searchUrls.length === 0) {
    const serpProvider = createSearchProvider(env);
    
    if (serpProvider.name === 'fallback' && !env.SERP_API_KEY) {
      return { items: [], disabled: true, method: 'disabled' };
    }
    
    const queries = buildSearchQueries(originalCanonical, originalTitle);
    
    for (const query of queries) {
      try {
        console.log(`🔍 SERP: ${query}`);
        const results = await serpProvider.search(query);
        searchUrls.push(...results);
        searchMethod = 'serp';
        
        if (searchUrls.length >= 12) break;
      } catch (error) {
        console.warn('SERP failed:', error);
      }
    }
  }
  
  // PRIORIDADE 3: Fallback direto
  if (searchUrls.length === 0) {
    searchUrls = buildFallbackUrls(originalCanonical, originalTitle);
    searchMethod = 'fallback';
  }
  
  // Processar URLs
  for (const url of searchUrls.slice(0, 12)) {
    if (seenUrls.has(url)) continue;
    if (Date.now() - startTime > BUDGET_MS) break;
    
    seenUrls.add(url);
    
    try {
      const offer = await domainPool(url, async () => {
        return await withRetry(async () => {
          return await withTimeout(
            processEquivalentUrl(url, originalCanonical, originalTitle),
            3000,
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
    }
    
    if (marketItems.length >= maxResults) break;
  }
  
  const dedupedItems = dedupeAndSort(marketItems).slice(0, maxResults);
  
  if (dedupedItems.length > 0) {
    setCachedMarketSnapshot(canonicalKey, dedupedItems);
  }
  
  const finalResults = dedupedItems.map(item => ({
    productId: 0,
    title: '',
    price: item.price,
    currency: item.currency,
    domain: item.domain,
    sourceUrl: item.url,
    imageUrl: null,
    confidence: item.confidence,
  }));
  
  const isPartial = finalResults.length < 3;
  
  console.log(`✅ Found ${finalResults.length} items via ${searchMethod} in ${Date.now() - startTime}ms`);
  
  return { 
    items: finalResults, 
    partial: isPartial,
    method: searchMethod 
  };
}

function buildSearchQueries(canonical: CanonicalIds, _title: string): string[] {
  const queries: string[] = [];
  const siteList = 'site:amazon.com.br OR site:mercadolivre.com.br OR site:magazineluiza.com.br OR site:kabum.com.br';
  
  if (canonical.gtin) {
    queries.push(`"${canonical.gtin}" (${siteList})`);
  }
  
  if (canonical.brand && canonical.model) {
    queries.push(`"${canonical.brand} ${canonical.model}" (${siteList})`);
  }
  
  if (canonical.asin) {
    queries.push(`"${canonical.asin}" site:amazon.com.br`);
  }
  
  return queries;
}

function buildFallbackUrls(canonical: CanonicalIds, title: string): string[] {
  const urls: string[] = [];
  
  let searchTerm = '';
  
  if (canonical.gtin) {
    searchTerm = canonical.gtin;
  } else if (canonical.brand && canonical.model) {
    searchTerm = `${canonical.brand} ${canonical.model}`;
  } else {
    searchTerm = title
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(' ')
      .filter(w => w.length > 3)
      .slice(0, 3)
      .join(' ');
  }
  
  const encoded = encodeURIComponent(searchTerm);
  
  urls.push(`https://www.amazon.com.br/s?k=${encoded}`);
  urls.push(`https://lista.mercadolivre.com.br/${encoded}`);
  urls.push(`https://www.magazineluiza.com.br/busca/${encoded}`);
  urls.push(`https://www.kabum.com.br/busca/${encoded}`);
  urls.push(`https://www.americanas.com.br/busca/${encoded}`);
  
  return urls;
}

async function processEquivalentUrl(
  url: string,
  sourceCanonical: CanonicalIds,
  sourceTitle: string
): Promise<OfferResolved | null> {
  try {
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
    
    const targetCanonical = resolveCanonicalIds(productData, url);
    const sourceIdentity = { canonical: sourceCanonical, confidence: 1.0 };
    const targetIdentity = { canonical: targetCanonical, confidence: 1.0 };
    
    const matchResult = sameProduct(sourceIdentity, targetIdentity, sourceTitle, productData.title);
    if (!matchResult.ok) {
      return null;
    }
    
    if (!productData.price || productData.price <= 0) {
      return null;
    }
    
    const domain = new URL(url).hostname.replace('www.', '');
    
    return {
      productId: 0,
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
