// src/worker/search/ai-provider.ts
import { CanonicalIds } from '@/shared/types';

interface AISearchResult {
  urls: string[];
  confidence: number;
  reasoning?: string;
}

export class GroqSearchProvider {
  private apiKey: string;
  private baseUrl = 'https://api.groq.com/openai/v1/chat/completions';
  
  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }
  
  async searchProduct(canonical: CanonicalIds, title: string): Promise<AISearchResult> {
    console.log('🤖 GroqSearchProvider.searchProduct() called');
    console.log('  Product:', title.substring(0, 50));
    console.log('  GTIN:', canonical.gtin || 'none');
    console.log('  Brand/Model:', canonical.brand && canonical.model ? `${canonical.brand} ${canonical.model}` : 'none');
    
    const prompt = this.buildSearchPrompt(canonical, title);
    console.log('  Prompt length:', prompt.length);
    console.log('  Using model: llama-3.1-8b-instant (updated from deprecated model)');
    
    try {
      console.log('  Calling Groq API...');
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'llama-3.1-8b-instant',
          messages: [
            {
              role: 'system',
              content: 'Você é um assistente especializado em encontrar produtos em lojas brasileiras. Retorne APENAS URLs válidas de produtos equivalentes.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.1,
          max_tokens: 500,
        }),
      });
      
      console.log('  Groq API response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('  Groq API error response:', errorText);
        throw new Error(`Groq API error: ${response.status} - ${errorText}`);
      }
      
      const data = await response.json() as any;
      const content = data.choices[0]?.message?.content || '';
      console.log('  Groq response length:', content.length);
      console.log('  Groq response preview:', content.substring(0, 200));
      
      const urls = this.extractUrls(content);
      console.log('  ✅ Extracted URLs:', urls.length);
      urls.forEach((url, i) => console.log(`    ${i + 1}. ${url}`));
      
      return {
        urls: urls.slice(0, 8),
        confidence: urls.length > 0 ? 0.85 : 0,
        reasoning: content,
      };
    } catch (error) {
      console.error('❌ Groq search failed:', {
        error: error instanceof Error ? error.message : String(error),
        type: error instanceof Error ? error.constructor.name : typeof error,
        stack: error instanceof Error ? error.stack : undefined
      });
      return { urls: [], confidence: 0 };
    }
  }
  
  private buildSearchPrompt(canonical: CanonicalIds, title: string): string {
    let prompt = `🎯 ESPECIALISTA EM E-COMMERCE BRASILEIRO\n\n`;
    prompt += `Você é um especialista em encontrar produtos equivalentes nas principais lojas online do Brasil.\n\n`;
    
    prompt += `📋 PRODUTO ALVO:\n`;
    prompt += `Título: "${title}"\n`;
    
    if (canonical.gtin) {
      prompt += `🏷️ EAN/GTIN: ${canonical.gtin} (USE ESTE CÓDIGO PARA BUSCA EXATA)\n`;
    }
    
    if (canonical.asin) {
      prompt += `📦 ASIN Amazon: ${canonical.asin} (PRODUTO AMAZON VÁLIDO)\n`;
    }
    
    if (canonical.brand && canonical.model) {
      prompt += `🏢 MARCA: ${canonical.brand}\n`;
      prompt += `📱 MODELO: ${canonical.model}\n`;
    }
    
    prompt += `\n🎯 SUA MISSÃO:\n`;
    prompt += `Encontre URLs DIRETAS de produtos EQUIVALENTES/IDÊNTICOS nas lojas:\n\n`;
    
    prompt += `🏪 LOJAS PRIORITÁRIAS:\n`;
    prompt += `• Amazon Brasil: amazon.com.br/dp/[ASIN]\n`;
    prompt += `• Mercado Livre: mercadolivre.com.br/[produto]/p/MLB[numero]\n`;
    prompt += `• Magazine Luiza: magazineluiza.com.br/[produto]/p/[codigo]\n`;
    prompt += `• KaBuM: kabum.com.br/produto/[codigo]/[nome]\n`;
    prompt += `• Americanas: americanas.com.br/produto/[codigo]/[nome]\n`;
    prompt += `• Submarino: submarino.com.br/produto/[codigo]/[nome]\n`;
    prompt += `• Shopee: shopee.com.br/[produto]\n`;
    prompt += `• Casas Bahia: casasbahia.com.br/[produto]/[codigo]\n\n`;
    
    prompt += `✅ FORMATO CORRETO DE RESPOSTA:\n`;
    prompt += `Retorne APENAS as URLs válidas, uma por linha:\n\n`;
    prompt += `https://www.amazon.com.br/dp/B0ABC12345\n`;
    prompt += `https://produto.mercadolivre.com.br/produto-nome/p/MLB123456789\n`;
    prompt += `https://www.magazineluiza.com.br/produto-exemplo/p/abc123def456\n`;
    prompt += `https://www.kabum.com.br/produto/123456/produto-nome\n\n`;
    
    prompt += `❌ NÃO RETORNE:\n`;
    prompt += `• URLs de busca (/s?k=, /busca/, /search?q=)\n`;
    prompt += `• URLs de categoria ou listagem\n`;
    prompt += `• URLs de lojas pequenas/desconhecidas\n`;
    prompt += `• URLs quebradas ou incompletas\n\n`;
    
    prompt += `🔍 ESTRATÉGIA DE BUSCA:\n`;
    if (canonical.gtin) {
      prompt += `1. PRIORIDADE MÁXIMA: Use o EAN/GTIN ${canonical.gtin} para busca exata\n`;
    }
    if (canonical.asin) {
      prompt += `2. Amazon: Produto com ASIN ${canonical.asin} já existe\n`;
    }
    if (canonical.brand && canonical.model) {
      prompt += `3. Busque pela combinação exata: "${canonical.brand} ${canonical.model}"\n`;
    }
    prompt += `4. Use palavras-chave do título para produtos similares\n\n`;
    
    prompt += `✨ IMPORTANTE:\n`;
    prompt += `• Retorne APENAS URLs que você tem CERTEZA que existem\n`;
    prompt += `• Prefira produtos IDÊNTICOS aos similares\n`;
    prompt += `• Máximo 8 URLs de qualidade\n`;
    prompt += `• URLs devem ser acessíveis e válidas\n\n`;
    
    return prompt;
  }
  
  private extractUrls(text: string): string[] {
    const urlRegex = /https?:\/\/[^\s<>"]+/g;
    const matches = text.match(urlRegex) || [];
    
    const validDomains = [
      'amazon.com.br',
      'mercadolivre.com.br',
      'magazineluiza.com.br',
      'kabum.com.br',
      'americanas.com.br',
      'shopee.com.br',
      'submarino.com.br',
      'casasbahia.com.br',
    ];
    
    return matches.filter(url => 
      validDomains.some(domain => url.includes(domain))
    );
  }
}

export class PerplexitySearchProvider {
  private apiKey: string;
  private baseUrl = 'https://api.perplexity.ai/chat/completions';
  
  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }
  
  async searchProduct(canonical: CanonicalIds, title: string): Promise<AISearchResult> {
    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'llama-3.1-sonar-small-128k-online',
          messages: [
            {
              role: 'system',
              content: 'Você busca produtos em lojas brasileiras. Use busca online para encontrar URLs atuais.'
            },
            {
              role: 'user',
              content: this.buildPerplexityPrompt(canonical, title)
            }
          ],
        }),
      });
      
      if (!response.ok) {
        throw new Error(`Perplexity API error: ${response.status}`);
      }
      
      const data = await response.json() as any;
      const content = data.choices[0]?.message?.content || '';
      const citations = data.citations || [];
      const urls = [...new Set([...citations, ...this.extractUrls(content)])];
      
      return {
        urls: urls.slice(0, 8),
        confidence: urls.length > 0 ? 0.9 : 0,
        reasoning: content,
      };
    } catch (error) {
      console.error('Perplexity search failed:', error);
      return { urls: [], confidence: 0 };
    }
  }
  
  private buildPerplexityPrompt(canonical: CanonicalIds, title: string): string {
    if (canonical.gtin) {
      return `Onde comprar produto EAN ${canonical.gtin} no Brasil? Retorne URLs de lojas.`;
    }
    
    if (canonical.brand && canonical.model) {
      return `Comprar ${canonical.brand} ${canonical.model} preço Brasil`;
    }
    
    return `${title} comprar online Brasil`;
  }
  
  private extractUrls(text: string): string[] {
    const urlRegex = /https?:\/\/[^\s<>"]+/g;
    return text.match(urlRegex) || [];
  }
}

export function createAISearchProvider(env: any) {
  console.log('🤖 createAISearchProvider() called');
  console.log('  GROQ_API_KEY:', env.GROQ_API_KEY ? `✅ exists (${env.GROQ_API_KEY.length} chars, starts with ${env.GROQ_API_KEY.substring(0, 10)}...)` : '❌ missing');
  console.log('  PERPLEXITY_API_KEY:', env.PERPLEXITY_API_KEY ? `✅ exists (${env.PERPLEXITY_API_KEY.length} chars)` : '❌ missing');
  
  if (env.GROQ_API_KEY) {
    console.log('✅ Using Groq AI for product search');
    return new GroqSearchProvider(env.GROQ_API_KEY);
  }
  
  if (env.PERPLEXITY_API_KEY) {
    console.log('✅ Using Perplexity AI for product search');
    return new PerplexitySearchProvider(env.PERPLEXITY_API_KEY);
  }
  
  console.log('❌ No AI provider configured - falling back to SERP/direct search');
  return null;
}
