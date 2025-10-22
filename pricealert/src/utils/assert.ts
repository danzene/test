export function assert(cond: any, msg = "assertion failed"): asserts cond {
  if (!cond) throw new Error(msg);
}

export function notNull<T>(v: T | null | undefined, msg = "value is null"): T {
  if (v == null) throw new Error(msg);
  return v;
}

/** Converte string "R$ 1.234,56" em número 1234.56; retorna null se inválido */
export function parsePriceBRL(input?: string | null): number | null {
  if (!input) return null;
  
  // Skip prices with installment indicators
  if (/\d+x\s+de|\d+x\s+R\$|em\s+\d+x|juros/i.test(input)) {
    return null;
  }
  
  const s = input
    .replace(/\s+/g, " ")
    .replace(/de\s*R\$\s*\d{1,3}(\.\d{3})*,\d{2}/i, "");
  const m = s.match(/R\$\s*([\d\.\,]+)/);
  if (!m) return null;
  const v = Number(m[1].replace(/\./g, "").replace(",", "."));
  return Number.isFinite(v) && v > 0 ? Number(v.toFixed(2)) : null;
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
