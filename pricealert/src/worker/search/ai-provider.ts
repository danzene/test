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
    const prompt = this.buildSearchPrompt(canonical, title);
    
    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'llama-3.1-70b-versatile',
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
      
      if (!response.ok) {
        throw new Error(`Groq API error: ${response.status}`);
      }
      
      const data = await response.json();
      const content = data.choices[0]?.message?.content || '';
      const urls = this.extractUrls(content);
      
      return {
        urls: urls.slice(0, 8),
        confidence: urls.length > 0 ? 0.85 : 0,
        reasoning: content,
      };
    } catch (error) {
      console.error('Groq search failed:', error);
      return { urls: [], confidence: 0 };
    }
  }
  
  private buildSearchPrompt(canonical: CanonicalIds, title: string): string {
    let prompt = `Encontre URLs de produtos EQUIVALENTES nas lojas brasileiras:\n\n`;
    prompt += `Produto: ${title}\n`;
    
    if (canonical.gtin) {
      prompt += `GTIN/EAN: ${canonical.gtin}\n`;
    }
    if (canonical.brand && canonical.model) {
      prompt += `Marca: ${canonical.brand}\nModelo: ${canonical.model}\n`;
    }
    if (canonical.asin) {
      prompt += `ASIN (Amazon): ${canonical.asin}\n`;
    }
    
    prompt += `\nLojas para buscar:\n`;
    prompt += `- Amazon BR: amazon.com.br\n`;
    prompt += `- Mercado Livre: mercadolivre.com.br\n`;
    prompt += `- Magalu: magazineluiza.com.br\n`;
    prompt += `- KaBuM: kabum.com.br\n`;
    prompt += `- Americanas: americanas.com.br\n`;
    prompt += `- Shopee: shopee.com.br\n`;
    
    prompt += `\nRetorne APENAS URLs completas (começando com https://) do produto EXATO ou equivalente, uma por linha.`;
    
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
      
      const data = await response.json();
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
    let query = `Encontre onde comprar online no Brasil: ${title}`;
    
    if (canonical.gtin) {
      query = `Produto com EAN ${canonical.gtin}: ${title}`;
    } else if (canonical.brand && canonical.model) {
      query = `${canonical.brand} ${canonical.model} preço Brasil`;
    }
    
    query += ` site:amazon.com.br OR site:mercadolivre.com.br OR site:magazineluiza.com.br OR site:kabum.com.br`;
    
    return query;
  }
  
  private extractUrls(text: string): string[] {
    const urlRegex = /https?:\/\/[^\s<>"]+/g;
    return text.match(urlRegex) || [];
  }
}

export function createAISearchProvider(env: any) {
  if (env.GROQ_API_KEY) {
    console.log('Using Groq AI for product search');
    return new GroqSearchProvider(env.GROQ_API_KEY);
  }
  
  if (env.PERPLEXITY_API_KEY) {
    console.log('Using Perplexity AI for product search');
    return new PerplexitySearchProvider(env.PERPLEXITY_API_KEY);
  }
  
  return null;
}
