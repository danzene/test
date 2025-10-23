// src/worker/search/equivalents.ts
import { CanonicalIds, OfferResolved } from '@/shared/types';
import { MarketItem } from '@/types/product';
import { dedupeAndSort } from '@/utils/assert';
import { createAISearchProvider } from './ai-provider';
import { createSearchProvider } from './provider';
import { sameProduct, resolveCanonicalIds } from '../ingest/identity';
import { scrapeAmazonBr } from '../ingest/adapters/amazonBr';
import { scrapeMercadoLivre } from '../ingest/adapters/mercadolivre';
import { scrapeMagalu } from '../ingest/adapters/magalu';
import { scrapeKabum } from '../ingest/adapters/kabum';
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
    console.log(`✅ Cache hit: ${cached.length} items`);
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
  
  console.log('🔍 findEquivalentsStrict() started');
  console.log('  Product:', originalTitle.substring(0, 50));
  console.log('  Canonical:', canonicalKey);
  
  // PRIORIDADE 1: IA (Groq/Perplexity) - GRATUITO
  const aiProvider = createAISearchProvider(env);
  
  if (aiProvider) {
    try {
      console.log('🤖 AI Provider available - calling searchProduct()...');
      const aiResult = await withTimeout(
        aiProvider.searchProduct(originalCanonical, originalTitle),
        10000,  // Aumentado para 10s para dar mais tempo à IA
        'ai-search-timeout'
      );
      
      console.log('🤖 AI Result:', {
        urls: aiResult.urls.length,
        confidence: aiResult.confidence,
        reasoning_length: aiResult.reasoning?.length || 0
      });
      
      if (aiResult.urls.length > 0) {
        searchUrls = aiResult.urls;
        searchMethod = 'ai';
        console.log(`✅ IA encontrou ${searchUrls.length} URLs - usando método 'ai'`);
      } else {
        console.log(`⚠️ IA não retornou URLs válidas (confidence: ${aiResult.confidence})`);
      }
    } catch (error) {
      console.error('❌ IA falhou, usando fallback:', {
        error: error instanceof Error ? error.message : String(error),
        type: error instanceof Error ? error.constructor.name : typeof error
      });
    }
  } else {
    console.log('⚠️ No AI provider available - skipping AI search');
  }
  
  // PRIORIDADE 2: SERP API (fallback)
  if (searchUrls.length === 0) {
    const serpProvider = createSearchProvider(env);
    
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
            5000,
            "process-url-5s"
          );
        });
      });
      
      if (offer && offer.confidence >= 0.7 && offer.price && offer.price > 0) {
        console.log(`✅ URL processada: ${url} - Preço: R$${offer.price} - Confiança: ${offer.confidence}`);
        marketItems.push({
          domain: offer.domain,
          url: offer.sourceUrl,
          price: offer.price,
          currency: offer.currency as "BRL",
          confidence: offer.confidence,
          collectedAt: new Date().toISOString(),
        });
      } else {
        console.log(`❌ URL rejeitada: ${url} - ${!offer ? 'falha na extração' : offer.confidence < 0.7 ? 'baixa confiança' : 'sem preço'}`);
      }
    } catch (error) {
      console.error(`❌ URL falhou: ${url} - ${error instanceof Error ? error.message : error}`);
    }
    
    if (marketItems.length >= maxResults) break;
  }
  
  const dedupedItems = dedupeAndSort(marketItems).slice(0, maxResults);
  
  // Só cachear se encontrou resultados válidos
  if (dedupedItems.length > 0) {
    console.log(`💾 Cacheando ${dedupedItems.length} resultados`);
    setCachedMarketSnapshot(canonicalKey, dedupedItems);
  } else {
    console.log(`⚠️ Nenhum resultado para cachear`);
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
  
  console.log(`📊 RESULTADO FINAL: ${finalResults.length} items via ${searchMethod} em ${Date.now() - startTime}ms`);
  console.log(`📈 URLs processadas: ${seenUrls.size} | Válidas: ${marketItems.length} | Finais: ${finalResults.length}`);
  
  return { 
    items: finalResults, 
    partial: isPartial,
    method: searchMethod 
  };
}

function buildSearchQueries(canonical: CanonicalIds, title: string): string[] {
  const queries: string[] = [];
  
  if (canonical.gtin) {
    queries.push(`${canonical.gtin} produto`);
  }
  
  if (canonical.brand && canonical.model) {
    queries.push(`${canonical.brand} ${canonical.model}`);
  }
  
  if (canonical.asin) {
    queries.push(`${canonical.asin} amazon`);
  }
  
  // Fallback com titulo simplificado
  const searchTerms = title
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .split(' ')
    .filter(w => w.length > 3)
    .slice(0, 3)
    .join(' ');
  
  if (searchTerms && !queries.length) {
    queries.push(searchTerms);
  }
  
  return queries;
}

function buildFallbackUrls(canonical: CanonicalIds, title: string): string[] {
  const urls: string[] = [];
  
  // Se tiver ASIN, focar só na Amazon com produto específico
  if (canonical.asin) {
    urls.push(`https://www.amazon.com.br/s?k=${canonical.asin}`);
    // Não adicionar outras lojas para ASIN, pois é específico da Amazon
    return urls;
  }
  
  // Se tiver GTIN, usar termo limpo
  if (canonical.gtin) {
    urls.push(`https://www.amazon.com.br/s?k=${canonical.gtin}`);
    urls.push(`https://lista.mercadolivre.com.br/${canonical.gtin}`);
    urls.push(`https://www.magazineluiza.com.br/busca/${canonical.gtin}`);
    urls.push(`https://www.kabum.com.br/busca/${canonical.gtin}`);
    return urls;
  }
  
  // Se tiver brand + model, usar termos específicos
  if (canonical.brand && canonical.model) {
    const brandModel = `${canonical.brand} ${canonical.model}`;
    const encoded = encodeURIComponent(brandModel);
    
    urls.push(`https://www.amazon.com.br/s?k=${encoded}`);
    urls.push(`https://lista.mercadolivre.com.br/${encoded}`);
    urls.push(`https://www.magazineluiza.com.br/busca/${encoded}`);
    urls.push(`https://www.kabum.com.br/busca/${encoded}`);
    return urls;
  }
  
  // Fallback com palavras-chave do título (máximo 2 termos)
  const searchTerm = title
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .split(' ')
    .filter(w => w.length > 3)
    .slice(0, 2) // Reduzir para 2 termos
    .join(' ');
  
  if (!searchTerm) return urls;
  
  const encoded = encodeURIComponent(searchTerm);
  
  urls.push(`https://www.amazon.com.br/s?k=${encoded}`);
  urls.push(`https://lista.mercadolivre.com.br/${encoded}`);
  urls.push(`https://www.magazineluiza.com.br/busca/${encoded}`);
  urls.push(`https://www.kabum.com.br/busca/${encoded}`);
  
  return urls;
}

async function processEquivalentUrl(
  url: string,
  sourceCanonical: CanonicalIds,
  sourceTitle: string
): Promise<OfferResolved | null> {
  try {
    let productData;
    
    // Escolher scraper baseado no domínio da URL, não no conteúdo
    const urlObj = new URL(url);
    const domain = urlObj.hostname.toLowerCase();
    
    if (domain.includes('amazon.')) {
      productData = await scrapeAmazonBr(url);
    } else if (domain.includes('mercadolivre.') || domain.includes('mercadolibre.')) {
      productData = await scrapeMercadoLivre(url);
    } else if (domain.includes('magazineluiza.') || domain.includes('magalu.')) {
      productData = await scrapeMagalu(url);
    } else if (domain.includes('kabum.')) {
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
    
    const cleanDomain = urlObj.hostname.replace('www.', '');
    
    return {
      productId: 0,
      title: productData.title,
      price: productData.price,
      currency: productData.currency,
      domain: cleanDomain,
      sourceUrl: url,
      imageUrl: productData.imageUrl,
      confidence: matchResult.confidence,
    };
  } catch (error) {
    console.error(`Failed to process equivalent URL ${url}:`, error);
    return null;
  }
}
