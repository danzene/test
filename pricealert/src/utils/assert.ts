export function assert(cond: any, msg = "assertion failed"): asserts cond {
  if (!cond) throw new Error(msg);
}

export function notNull<T>(v: T | null | undefined, msg = "value is null"): T {
  if (v == null) throw new Error(msg);
  return v;
}

/** Converte string "R$ 1.234,56" em número 1234.56; retorna null se inválido */
export function parsePriceBRL(input?: string | null): number | null {
  if (!input || typeof input !== 'string') return null;
  
  console.log(`💰 Parsing price: "${input}"`);
  
  // Skip prices with installment indicators
  if (/\d+x\s+de|\d+x\s+R\$|em\s+\d+x|juros|parcela/i.test(input)) {
    console.log('❌ Rejected: installment detected');
    return null;
  }
  
  // Handle "de R$ X por R$ Y" - extract the final price
  const finalPriceMatch = input.match(/por\s+R\$\s*([\d\.\,]+)/i);
  if (finalPriceMatch) {
    console.log(`✅ Found "por R$" pattern: ${finalPriceMatch[1]}`);
    const v = Number(finalPriceMatch[1].replace(/\./g, "").replace(",", "."));
    return Number.isFinite(v) && v > 0 ? Number(v.toFixed(2)) : null;
  }
  
  // Skip "de R$" without "por"
  if (/de\s+R\$/i.test(input) && !/por\s+R\$/i.test(input)) {
    console.log('❌ Rejected: "de R$" without "por"');
    return null;
  }
  
  // Standard price extraction
  const priceMatch = input.match(/R\$\s*([\d\.\,]+)/i);
  if (!priceMatch) {
    console.log('❌ No R$ pattern found');
    return null;
  }
  
  const priceStr = priceMatch[1];
  let numericValue: number;
  
  // Handle different Brazilian number formats
  if (priceStr.includes(',') && priceStr.includes('.')) {
    // Format: 1.299,99
    const parts = priceStr.split(',');
    if (parts.length === 2) {
      const integerPart = parts[0].replace(/\./g, '');
      const decimalPart = parts[1];
      numericValue = parseFloat(`${integerPart}.${decimalPart}`);
    } else {
      console.log('❌ Invalid format with both , and .');
      return null;
    }
  } else if (priceStr.includes(',')) {
    // Format: 1299,99 or 1.299,99
    const lastCommaIndex = priceStr.lastIndexOf(',');
    const afterComma = priceStr.substring(lastCommaIndex + 1);
    
    if (afterComma.length === 2) {
      // Decimal comma: 1299,99
      const beforeComma = priceStr.substring(0, lastCommaIndex).replace(/\./g, '');
      numericValue = parseFloat(`${beforeComma}.${afterComma}`);
    } else {
      // Thousands separator: 1.299,99 -> already handled above
      numericValue = parseFloat(priceStr.replace(/\./g, '').replace(',', '.'));
    }
  } else if (priceStr.includes('.')) {
    // Could be 1299.99 (US format) or 1.299 (BR thousands)
    const lastDotIndex = priceStr.lastIndexOf('.');
    const afterDot = priceStr.substring(lastDotIndex + 1);
    
    if (afterDot.length === 2) {
      // Decimal dot: 1299.99
      numericValue = parseFloat(priceStr);
    } else {
      // Thousands separator: 1.299
      numericValue = parseFloat(priceStr.replace(/\./g, ''));
    }
  } else {
    // No separators: 1299
    numericValue = parseFloat(priceStr);
  }
  
  const result = Number.isFinite(numericValue) && numericValue > 0 ? Number(numericValue.toFixed(2)) : null;
  console.log(`💰 Parsed "${input}" -> ${result}`);
  return result;
}

import { MarketItem } from '@/types/product';

/** Deduplica e ordena itens de mercado por preço (menor primeiro) */
export function dedupeAndSort(items: MarketItem[]): MarketItem[] {
  const byDomain = new Map<string, MarketItem>();
  for (const it of items) {
    const curr = byDomain.get(it.domain);
    if (!curr || it.price < curr.price || (it.price === curr.price && it.confidence > curr.confidence)) {
      byDomain.set(it.domain, it);
    }
  }
  return [...byDomain.values()]
    .filter(i => Number.isFinite(i.price) && i.price > 0)
    .sort((a, b) => (a.price - b.price) || (b.confidence - a.confidence));
}
