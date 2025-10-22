import { describe, it, expect } from "vitest";
import { dedupeAndSort } from "../src/utils/assert";
import { MarketItem } from "../src/types/product";

describe("dedupe + sort", () => {
  it("mantém menor por domínio e ordena asc", () => {
    const items: MarketItem[] = [
      { domain:"a.com", url:"#", price: 100, currency:"BRL", confidence:0.8, collectedAt:"" },
      { domain:"b.com", url:"#", price: 50,  currency:"BRL", confidence:0.9, collectedAt:"" },
      { domain:"a.com", url:"#", price: 80,  currency:"BRL", confidence:0.6, collectedAt:"" },
    ];
    
    const out = dedupeAndSort(items);
    expect(out.map(i=>i.domain)).toEqual(["b.com","a.com"]);
    expect(out[0].price).toBe(50);
    expect(out[1].price).toBe(80);
  });
  
  it("filtra preços inválidos", () => {
    const items: MarketItem[] = [
      { domain:"a.com", url:"#", price: 0, currency:"BRL", confidence:0.8, collectedAt:"" },
      { domain:"b.com", url:"#", price: 100, currency:"BRL", confidence:0.9, collectedAt:"" },
      { domain:"c.com", url:"#", price: NaN, currency:"BRL", confidence:0.7, collectedAt:"" },
    ];
    
    const out = dedupeAndSort(items);
    expect(out).toHaveLength(1);
    expect(out[0].domain).toBe("b.com");
  });
  
  it("escolhe maior confiança em caso de empate no preço", () => {
    const items: MarketItem[] = [
      { domain:"a.com", url:"#", price: 100, currency:"BRL", confidence:0.8, collectedAt:"" },
      { domain:"b.com", url:"#", price: 100, currency:"BRL", confidence:0.9, collectedAt:"" },
    ];
    
    const out = dedupeAndSort(items);
    expect(out[0].confidence).toBe(0.9);
    expect(out[1].confidence).toBe(0.8);
  });
});
