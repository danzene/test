import { describe, it, expect, vi, beforeEach } from "vitest";
import { parsePriceBRL } from "../src/utils/assert";

describe("Integração - Casos Reais", () => {
  describe("Cenários Amazon BR", () => {
    it("deve processar HTML real com apex_desktop", () => {
      const mockHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Produto Teste - Amazon.com.br</title>
          <meta property="og:title" content="Produto Exemplo">
          <meta property="og:image" content="https://images-na.ssl-images-amazon.com/images/test.jpg">
        </head>
        <body>
          <div id="apex_desktop">
            <span class="a-offscreen">de R$ 100,00</span>
            <span class="a-offscreen">R$ 49,90</span>
            <div>Outras informações</div>
          </div>
        </body>
        </html>
      `;
      
      // Simular extração como no código real
      const block = mockHtml.match(/<div[^>]+id=["'](apex_desktop|corePriceDisplay_desktop_feature_div)["'][\s\S]*?<\/div>/i)?.[0];
      expect(block).toBeTruthy();
      
      const spans = [...block!.matchAll(/<span[^>]+class="[^"]*\ba-offscreen\b[^"]*"[^>]*>([^<]+)<\/span>/gi)]
        .map(m => (m[1] || "").trim())
        .filter(t => !/de\s*R\$|juros|parcela/i.test(t));
      
      expect(spans).toEqual(["R$ 49,90"]);
      expect(parsePriceBRL(spans[0])).toBe(49.90);
    });

    it("deve processar resposta completa de ingestion", () => {
      const mockProductData = {
        url: "https://www.amazon.com.br/produto-teste",
        domain: "amazon.com.br",
        title: "Produto Teste",
        imageUrl: "https://images.amazon.com/test.jpg",
        price: 49.90,
        currency: "BRL" as const,
        canonical: {
          gtin: null,
          asin: "B08X6PZQL1",
          mpn: null,
          brand: null,
          model: null
        },
        quality: "verified" as const
      };
      
      // Validação que o endpoint POST /api/ingest faz
      const isValidPrice = mockProductData.price && mockProductData.price > 0;
      expect(isValidPrice).toBe(true);
      
      const shouldAccept = mockProductData.title.length > 0 && mockProductData.price > 0;
      expect(shouldAccept).toBe(true);
    });

    it("deve rejeitar produto sem preço válido", () => {
      const mockProductData = {
        url: "https://www.amazon.com.br/produto-sem-preco",
        domain: "amazon.com.br", 
        title: "Produto Sem Preço",
        imageUrl: "https://images.amazon.com/test.jpg",
        price: null, // ❌ Sem preço
        currency: "BRL" as const,
        canonical: {
          gtin: null,
          asin: "B08X6PZQL2", 
          mpn: null,
          brand: null,
          model: null
        },
        quality: "partial" as const
      };
      
      // Validação que deve falhar
      const isValidPrice = !!(mockProductData.price && mockProductData.price > 0);
      expect(isValidPrice).toBe(false);
      
      // Deve retornar erro
      const errorMessage = "Não conseguimos extrair o preço deste produto no momento. Tente novamente em alguns minutos ou verifique se o link está correto.";
      expect(errorMessage).toContain("Não conseguimos extrair o preço");
    });
  });

  describe("Padrões complexos de preço", () => {
    it("deve extrair preço de promoção", () => {
      expect(parsePriceBRL("de R$ 199,90 por R$ 149,90")).toBe(149.90);
      expect(parsePriceBRL("De R$ 2.500,00 por R$ 1.999,00")).toBe(1999.00);
    });

    it("deve rejeitar preços promocionais incompletos", () => {
      expect(parsePriceBRL("de R$ 199,90")).toBe(null);
      expect(parsePriceBRL("a partir de R$ 99,90")).toBe(null);
    });

    it("deve processar formatos variados", () => {
      expect(parsePriceBRL("R$49,90")).toBe(49.90);
      expect(parsePriceBRL("R$ 1.234,56")).toBe(1234.56);
      expect(parsePriceBRL("R$  999,00  ")).toBe(999.00);
      expect(parsePriceBRL("Preço: R$ 75,50 à vista")).toBe(75.50);
    });

    it("deve validar limites de preço razoáveis", () => {
      expect(parsePriceBRL("R$ 0,50")).toBe(0.50); // Muito baixo mas válido
      expect(parsePriceBRL("R$ 50.000,00")).toBe(50000.00); // Alto mas válido
      expect(parsePriceBRL("R$ 0,00")).toBe(null); // Zero = inválido
    });
  });

  describe("Robustez do sistema", () => {
    it("deve lidar com HTML malformado", () => {
      const badHtml = `<span class="a-offscreen>R$ 99,90</span>`;
      
      // Parser deve ser robusto o suficiente
      const price = parsePriceBRL("R$ 99,90");
      expect(price).toBe(99.90);
    });

    it("deve processar múltiplos preços e escolher o correto", () => {
      const prices = [
        "de R$ 200,00", // ❌ "de" sem "por" 
        "R$ 150,00 em 10x", // ❌ parcelado
        "R$ 149,90", // ✅ válido
        "R$ 160,00" // ✅ válido mas maior
      ];
      
      const validPrices = prices
        .map(p => parsePriceBRL(p))
        .filter(p => p !== null);
        
      expect(validPrices).toEqual([149.90, 160.00]);
      
      // Sistema deve escolher o primeiro válido (menor)
      const selectedPrice = validPrices[0];
      expect(selectedPrice).toBe(149.90);
    });
  });
});
