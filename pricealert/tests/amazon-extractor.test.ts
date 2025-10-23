import { describe, it, expect, vi } from "vitest";
import { parsePriceBRL } from "../src/utils/assert";

describe("Amazon BR - Extração HTML", () => {
  describe("Padrões de preço Amazon", () => {
    it("deve extrair preço do apex_desktop", () => {
      const html = `
        <div id="apex_desktop">
          <span class="a-offscreen">R$ 49,90</span>
        </div>
      `;
      
      // Simular extração do preço
      const spans = [...html.matchAll(/<span[^>]+class="[^"]*\\ba-offscreen\\b[^"]*"[^>]*>([^<]+)<\/span>/gi)]
        .map(m => (m[1] || "").trim())
        .filter(t => !/de\\s*R\\$|juros|parcela/i.test(t));
      
      expect(spans.length).toBeGreaterThan(0);
      const price = parsePriceBRL(spans[0]);
      expect(price).toBe(49.90);
    });

    it("deve extrair preço do corePriceDisplay_desktop_feature_div", () => {
      const html = `
        <div id="corePriceDisplay_desktop_feature_div">
          <span class="a-offscreen">R$ 1.234,56</span>
        </div>
      `;
      
      const spans = [...html.matchAll(/<span[^>]+class="[^"]*\\ba-offscreen\\b[^"]*"[^>]*>([^<]+)<\/span>/gi)]
        .map(m => (m[1] || "").trim())
        .filter(t => !/de\\s*R\\$|juros|parcela/i.test(t));
      
      const price = parsePriceBRL(spans[0]);
      expect(price).toBe(1234.56);
    });

    it("deve extrair preço de data attributes", () => {
      const html = `
        <span data-a-color="price">R$ 99,99</span>
      `;
      
      const dataPrice = html.match(/data-a-color="price"[^>]*>([^<]+)<\\/span>/i)?.[1];
      expect(dataPrice).toBe("R$ 99,99");
      
      const price = parsePriceBRL(dataPrice || "");
      expect(price).toBe(99.99);
    });

    it("deve extrair preço do título da página", () => {
      const html = `
        <title>Produto Exemplo: R$ 75,50 | Amazon.com.br</title>
      `;
      
      const titlePrice = html.match(/<title>[^<]*R\\$\\s*([\\d\\.,]+)[^<]*<\\/title>/i)?.[1];
      expect(titlePrice).toBe("75,50");
      
      const price = parsePriceBRL(`R$ ${titlePrice}`);
      expect(price).toBe(75.50);
    });

    it("deve ignorar preços parcelados", () => {
      const html = `
        <div id="apex_desktop">
          <span class="a-offscreen">de R$ 1.000,00</span>
          <span class="a-offscreen">R$ 900,00 em 10x juros</span>
          <span class="a-offscreen">R$ 850,00</span>
        </div>
      `;
      
      const spans = [...html.matchAll(/<span[^>]+class="[^"]*\\ba-offscreen\\b[^"]*"[^>]*>([^<]+)<\/span>/gi)]
        .map(m => (m[1] || "").trim())
        .filter(t => !/de\\s*R\\$|juros|parcela/i.test(t));
      
      // Deve filtrar "de R$" e "juros", mantendo apenas "R$ 850,00"
      expect(spans.length).toBe(1);
      expect(parsePriceBRL(spans[0])).toBe(850.00);
    });
  });

  describe("ASIN extraction", () => {
    it("deve extrair ASIN da URL", () => {
      const url = "https://www.amazon.com.br/dp/B08X6PZQL1/ref=test";
      const asin = url.match(/\\/(dp|gp\\/product)\\/([A-Z0-9]{10})/i)?.[2];
      expect(asin).toBe("B08X6PZQL1");
    });

    it("deve extrair ASIN do HTML canonical", () => {
      const html = `
        <link rel="canonical" href="https://www.amazon.com.br/dp/B08X6PZQL1" />
      `;
      const asin = html.match(/<link[^>]+rel=["']canonical["'][^>]+href=["'][^"']+\\/(dp|gp\\/product)\\/([A-Z0-9]{10})/i)?.[2];
      expect(asin).toBe("B08X6PZQL1");
    });
  });
});
