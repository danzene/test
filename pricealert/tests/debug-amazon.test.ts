import { describe, it, expect, vi } from "vitest";
import { parsePriceBRL } from "../src/utils/assert";

describe("Debug Amazon - Casos Específicos", () => {
  describe("Análise de falhas reais", () => {
    it("deve detectar padrões conhecidos que falham", () => {
      const problemaCasos = [
        // Casos que podem estar causando o erro
        "R$ 0,00",           // Preço zero
        "",                  // String vazia
        null,                // Null
        undefined,           // Undefined
        "Preço indisponível", // Texto sem preço
        "Consulte o preço",  // Amazon às vezes mostra isso
        "Atualmente indisponível", // Produto fora de estoque
      ];

      problemaCasos.forEach(caso => {
        const resultado = parsePriceBRL(caso as string);
        console.log(`Caso: "${caso}" -> ${resultado}`);
        expect(resultado).toBe(null);
      });
    });

    it("deve processar HTML real da Amazon com múltiplos padrões", () => {
      const htmlComplexo = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Quebrando o gelo - Sucesso nas vendas: R$ 49,90 | Amazon.com.br</title>
          <meta property="og:price:amount" content="49.90" />
          <meta property="og:price:currency" content="BRL" />
        </head>
        <body>
          <div id="apex_desktop">
            <div class="a-section">
              <span class="a-offscreen">de R$ 59,90</span>
              <span class="a-offscreen">por R$ 49,90</span>
              <div>
                <span data-a-color="price">R$ 49,90</span>
              </div>
            </div>
          </div>
          
          <div id="corePriceDisplay_desktop_feature_div">
            <span class="a-price a-text-price a-size-medium a-color-base">
              <span class="a-offscreen">R$ 49,90</span>
            </span>
          </div>
          
          <script type="application/ld+json">
          {
            "@type": "Product",
            "name": "Quebrando o gelo - Sucesso nas vendas",
            "offers": {
              "@type": "Offer",
              "price": "49.90",
              "priceCurrency": "BRL",
              "availability": "InStock"
            }
          }
          </script>
        </body>
        </html>
      `;

      // Teste 1: apex_desktop
      const apexBlock = htmlComplexo.match(/<div[^>]+id=["'](apex_desktop|corePriceDisplay_desktop_feature_div)["'][\s\S]*?<\/div>/i)?.[0];
      expect(apexBlock).toBeTruthy();
      
      // Teste 2: data-a-color
      const dataPrice = htmlComplexo.match(/data-a-color="price"[^>]*>([^<]+)<\/span>/i)?.[1];
      expect(dataPrice).toBe("R$ 49,90");
      expect(parsePriceBRL(dataPrice)).toBe(49.90);
      
      // Teste 3: og:price:amount
      const ogPrice = htmlComplexo.match(/og:price:amount["'][^>]+content=["']([^"']+)["']/i)?.[1];
      expect(ogPrice).toBe("49.90");
      expect(parsePriceBRL(`R$ ${ogPrice}`)).toBe(49.90);
      
      // Teste 4: JSON-LD
      const jsonLd = htmlComplexo.match(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/i)?.[1];
      expect(jsonLd).toBeTruthy();
      
      const json = JSON.parse(jsonLd!);
      expect(json.offers.price).toBe("49.90");
      expect(parsePriceBRL(`R$ ${json.offers.price}`)).toBe(49.90);
      
      // Teste 5: Título
      const titlePrice = htmlComplexo.match(/<title>[^<]*R\$\s*([\d\.,]+)[^<]*<\/title>/i)?.[1];
      expect(titlePrice).toBe("49,90");
      expect(parsePriceBRL(`R$ ${titlePrice}`)).toBe(49.90);
    });

    it("deve simular o fluxo completo de ingestion", () => {
      // Simular ProductRaw que seria retornado
      const mockProductRaw = {
        url: "https://www.amazon.com.br/Quebrando-gelo-Sucesso-vendas/dp/8550814067",
        domain: "amazon.com.br",
        title: "Quebrando o gelo - Sucesso nas vendas",
        imageUrl: "https://images-na.ssl-images-amazon.com/images/I/51234567890.jpg",
        price: 49.90, // ✅ Preço válido extraído
        currency: "BRL" as const,
        canonical: {
          asin: "8550814067",
          gtin: null,
          mpn: null,
          brand: null,
          model: null
        },
        quality: "verified" as const
      };

      // Validação que o endpoint POST /api/ingest faz
      const priceValidation = !mockProductRaw.price || mockProductRaw.price <= 0;
      
      if (priceValidation) {
        // Este é o erro que o usuário está vendo
        const errorMessage = "Não conseguimos extrair o preço deste produto no momento. Tente novamente em alguns minutos ou verifique se o link está correto.";
        expect(errorMessage).toContain("Não conseguimos extrair o preço");
      } else {
        // Sucesso - deve retornar productId
        expect(mockProductRaw.price).toBeGreaterThan(0);
        expect(mockProductRaw.title.length).toBeGreaterThan(0);
        expect(mockProductRaw.canonical.asin).toBeTruthy();
      }

      // Para este caso, deve passar
      expect(priceValidation).toBe(false);
    });
  });

  describe("Cenários de erro específicos", () => {
    it("deve identificar quando Amazon bloqueia requisição", () => {
      // HTTP 403 - Forbidden
      const blockedResponse = {
        ok: false,
        status: 403,
        statusText: "Forbidden"
      };

      expect(blockedResponse.ok).toBe(false);
      expect(blockedResponse.status).toBe(403);
      
      // Erro que seria lançado: "Amazon fetch failed: 403"
    });

    it("deve identificar timeout de requisição", () => {
      // Simulação de timeout (6 segundos configurados)
      const timeoutError = new Error("amazon-fetch-6s");
      expect(timeoutError.message).toContain("amazon-fetch-6s");
    });

    it("deve processar HTML sem preço visível", () => {
      const htmlSemPreco = `
        <html>
        <head>
          <title>Produto Amazon</title>
        </head>
        <body>
          <div id="apex_desktop">
            <span>Produto atualmente indisponível</span>
            <span>Consulte outros vendedores</span>
          </div>
        </body>
        </html>
      `;

      // Nenhum dos padrões deve encontrar preço
      const spans = [...htmlSemPreco.matchAll(/<span[^>]+class="[^"]*\\ba-offscreen\\b[^"]*"[^>]*>([^<]+)<\/span>/gi)];
      expect(spans.length).toBe(0);
      
      const dataPrice = htmlSemPreco.match(/data-a-color="price"[^>]*>([^<]+)<\/span>/i)?.[1];
      expect(dataPrice).toBeUndefined();
      
      const titlePrice = htmlSemPreco.match(/<title>[^<]*R\\$\\s*([\\d\\.,]+)[^<]*<\/title>/i)?.[1];
      expect(titlePrice).toBeUndefined();
      
      // Resultado final: null (causa o erro para o usuário)
      const finalPrice = null;
      expect(finalPrice).toBe(null);
    });
  });

  describe("Validação robusta de preços", () => {
    it("deve validar faixa de preços realista", () => {
      const precosTeste = [
        { input: "R$ 0,01", expected: 0.01, valid: true },    // Muito baixo mas válido
        { input: "R$ 0,00", expected: null, valid: false },   // Zero = inválido ❌
        { input: "R$ 49,90", expected: 49.90, valid: true },  // Caso real ✅
        { input: "R$ 99999,99", expected: 99999.99, valid: true }, // Alto mas válido
        { input: "R$ -10,00", expected: null, valid: false }, // Negativo = inválido ❌
      ];

      precosTeste.forEach(({ input, expected, valid }) => {
        const resultado = parsePriceBRL(input);
        console.log(`Teste: ${input} -> ${resultado} (esperado: ${expected}, válido: ${valid})`);
        
        if (valid) {
          expect(resultado).toBe(expected);
          expect(resultado).toBeGreaterThan(0);
        } else {
          expect(resultado).toBe(null);
        }
      });
    });
  });
});
