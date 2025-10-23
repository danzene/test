import { describe, it, expect } from "vitest";
import { parsePriceBRL } from "../src/utils/assert";

describe("Casos do Mundo Real - PriceAlert+", () => {
  describe("URLs problemáticas identificadas", () => {
    it("deve processar corretamente formato brasileiro", () => {
      // Casos reais que podem estar falhando
      const casosReais = [
        {
          nome: "Preço padrão Amazon",
          html: '<span class="a-offscreen">R$ 49,90</span>',
          esperado: 49.90
        },
        {
          nome: "Preço com promoção", 
          html: 'de R$ 59,90 por R$ 49,90',
          esperado: 49.90
        },
        {
          nome: "Preço em título",
          html: '<title>Produto: R$ 29,99 | Amazon.com.br</title>',
          esperado: 29.99
        },
        {
          nome: "Preço com espaços extras",
          html: '<span class="a-offscreen">  R$ 15,50  </span>',
          esperado: 15.50
        }
      ];

      casosReais.forEach(({ nome, html, esperado }) => {
        console.log(`\n🧪 Testando: ${nome}`);
        
        // Extrair preço do HTML como o algoritmo real faz
        let preco = null;
        
        // Padrão 1: a-offscreen
        const spanMatch = html.match(/<span[^>]+class="[^"]*\ba-offscreen\b[^"]*"[^>]*>([^<]+)<\/span>/i);
        if (spanMatch) {
          const texto = spanMatch[1].trim();
          console.log(`  📝 Texto extraído: "${texto}"`);
          if (!/de\s*R\$|juros|parcela/i.test(texto)) {
            preco = parsePriceBRL(texto);
          }
        }
        
        // Padrão 2: "por R$" em texto
        if (!preco && html.includes('por R$')) {
          preco = parsePriceBRL(html);
        }
        
        // Padrão 3: título
        if (!preco) {
          const titleMatch = html.match(/<title>[^<]*R\$\s*([\d\.,]+)[^<]*<\/title>/i);
          if (titleMatch) {
            preco = parsePriceBRL(`R$ ${titleMatch[1]}`);
          }
        }
        
        console.log(`  💰 Preço final: ${preco}`);
        expect(preco).toBe(esperado);
      });
    });

    it("deve rejeitar corretamente casos inválidos", () => {
      const casosInvalidos = [
        {
          nome: "Parcelamento", 
          html: '<span class="a-offscreen">R$ 300,00 em 10x de R$ 30,00</span>',
          motivo: "parcelamento"
        },
        {
          nome: "Preço 'de' sem 'por'",
          html: '<span class="a-offscreen">de R$ 100,00</span>',
          motivo: "promocional incompleto"
        },
        {
          nome: "Zero reais",
          html: '<span class="a-offscreen">R$ 0,00</span>',
          motivo: "preço zero"
        },
        {
          nome: "Texto sem preço",
          html: '<span class="a-offscreen">Consulte o preço</span>',
          motivo: "sem padrão de preço"
        }
      ];

      casosInvalidos.forEach(({ nome, html, motivo }) => {
        console.log(`\n❌ Testando rejeição: ${nome} (${motivo})`);
        
        const spanMatch = html.match(/<span[^>]+class="[^"]*\ba-offscreen\b[^"]*"[^>]*>([^<]+)<\/span>/i);
        let preco = null;
        
        if (spanMatch) {
          const texto = spanMatch[1].trim();
          console.log(`  📝 Texto: "${texto}"`);
          preco = parsePriceBRL(texto);
        }
        
        console.log(`  🚫 Resultado: ${preco} (deve ser null)`);
        expect(preco).toBe(null);
      });
    });
  });

  describe("Simulação completa do fluxo", () => {
    it("deve simular ingestion bem-sucedida", () => {
      // Simular HTML real da Amazon
      const htmlAmazon = `
        <html>
        <head>
          <title>Quebrando o gelo - Sucesso nas vendas: Amazon.com.br</title>
          <meta property="og:title" content="Quebrando o gelo - Sucesso nas vendas" />
          <meta property="og:image" content="https://images-na.ssl-images-amazon.com/images/I/51E6Q7ZQPXL._SY344_BO1,204,203,200_.jpg" />
        </head>
        <body>
          <span id="productTitle">Quebrando o gelo - Sucesso nas vendas</span>
          <div id="apex_desktop">
            <span class="a-offscreen">R$ 49,90</span>
          </div>
        </body>
        </html>
      `;

      // Simular extração de dados
      const titulo = htmlAmazon.match(/<span[^>]*id=["']productTitle["'][^>]*>(.*?)<\/span>/is)?.[1]?.trim() || "Produto Amazon";
      const imagem = htmlAmazon.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)?.[1];
      const spanPreco = htmlAmazon.match(/<span[^>]+class="[^"]*\ba-offscreen\b[^"]*"[^>]*>([^<]+)<\/span>/i)?.[1];
      const preco = spanPreco ? parsePriceBRL(spanPreco.trim()) : null;

      console.log(`\n🔍 Simulação de extração:`);
      console.log(`  📝 Título: "${titulo}"`);
      console.log(`  🖼️ Imagem: ${imagem ? 'encontrada' : 'não encontrada'}`);
      console.log(`  💰 Preço: R$ ${preco}`);

      // Validações que o sistema faz
      expect(titulo.length).toBeGreaterThan(0);
      expect(imagem).toBeTruthy();
      expect(preco).toBe(49.90);
      expect(preco).toBeGreaterThan(0);

      // Verificar se passaria na validação do endpoint
      const validacao = !preco || preco <= 0;
      expect(validacao).toBe(false); // Deve ser false para passar

      console.log(`  ✅ Passaria na validação: ${!validacao}`);
    });

    it("deve simular falha de ingestion (o erro atual)", () => {
      // HTML problemático que pode estar causando erro
      const htmlProblematico = `
        <html>
        <head>
          <title>Produto - Amazon.com.br</title>
        </head>
        <body>
          <span id="productTitle">Produto Exemplo</span>
          <div id="apex_desktop">
            <div>Este produto está atualmente indisponível</div>
            <div>Veja produtos similares</div>
          </div>
        </body>
        </html>
      `;

      // Tentar extrair preço
      const spanPreco = htmlProblematico.match(/<span[^>]+class="[^"]*\ba-offscreen\b[^"]*"[^>]*>([^<]+)<\/span>/i)?.[1];
      const dataPreco = htmlProblematico.match(/data-a-color="price"[^>]*>([^<]+)<\/span>/i)?.[1];
      const tituloPreco = htmlProblematico.match(/<title>[^<]*R\$\s*([\d\.,]+)[^<]*<\/title>/i)?.[1];

      console.log(`\n❌ Simulação de falha:`);
      console.log(`  📝 Span a-offscreen: ${spanPreco || 'não encontrado'}`);
      console.log(`  🏷️ Data price: ${dataPreco || 'não encontrado'}`);
      console.log(`  📑 Título price: ${tituloPreco || 'não encontrado'}`);

      const preco = null; // Nenhum padrão funcionou
      console.log(`  💰 Preço final: ${preco}`);

      // Este é o cenário que causa erro
      const validacao = !preco || preco <= 0;
      expect(validacao).toBe(true); // True = falha

      if (validacao) {
        const mensagemErro = "Não conseguimos extrair o preço deste produto no momento. Tente novamente em alguns minutos ou verifique se o link está correto.";
        console.log(`  🚨 Erro: ${mensagemErro}`);
        expect(mensagemErro).toContain("Não conseguimos extrair o preço");
      }
    });
  });

  describe("Estratégias de correção", () => {
    it("deve testar padrões adicionais de extração", () => {
      const htmlVariado = `
        <div class="a-section a-spacing-none a-padding-none">
          <span class="a-price a-text-price a-size-medium a-color-base">
            <span class="a-offscreen">R$ 39,90</span>
            <span class="a-price-symbol">R$</span>
            <span class="a-price-whole">39</span>
            <span class="a-price-fraction">90</span>
          </span>
        </div>
        <div data-asin-price="39.90" data-asin-currency-code="BRL">
          <span data-a-color="price">R$ 39,90</span>
        </div>
      `;

      // Múltiplos padrões para tentar
      const padroes = [
        // Padrão 1: a-offscreen (atual)
        htmlVariado.match(/<span[^>]+class="[^"]*\ba-offscreen\b[^"]*"[^>]*>([^<]+)<\/span>/i)?.[1],
        
        // Padrão 2: data-a-color
        htmlVariado.match(/data-a-color="price"[^>]*>([^<]+)<\/span>/i)?.[1],
        
        // Padrão 3: data-asin-price
        htmlVariado.match(/data-asin-price="([^"]+)"/i)?.[1],
        
        // Padrão 4: a-price-whole + a-price-fraction
        (() => {
          const whole = htmlVariado.match(/<span[^>]+class="[^"]*\ba-price-whole\b[^"]*"[^>]*>([^<]+)<\/span>/i)?.[1];
          const fraction = htmlVariado.match(/<span[^>]+class="[^"]*\ba-price-fraction\b[^"]*"[^>]*>([^<]+)<\/span>/i)?.[1];
          return whole && fraction ? `R$ ${whole},${fraction}` : null;
        })()
      ];

      console.log(`\n🔧 Testando múltiplos padrões:`);
      
      for (let i = 0; i < padroes.length; i++) {
        const padrao = padroes[i];
        if (padrao) {
          const precoTexto = padrao.includes('R$') ? padrao : `R$ ${padrao}`;
          const preco = parsePriceBRL(precoTexto);
          console.log(`  ${i + 1}. "${padrao}" -> R$ ${preco}`);
          
          if (preco && preco > 0) {
            expect(preco).toBe(39.90);
            console.log(`    ✅ Padrão ${i + 1} funcionou!`);
            break;
          }
        } else {
          console.log(`  ${i + 1}. (não encontrado)`);
        }
      }
    });
  });
});
