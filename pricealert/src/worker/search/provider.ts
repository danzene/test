interface SearchProvider {
  name: string;
  search(query: string): Promise<string[]>;
}

class SerperSearchProvider implements SearchProvider {
  name = 'serper';
  
  constructor(private apiKey: string) {}
  
  async search(query: string): Promise<string[]> {
    if (!this.apiKey) {
      throw new Error('Serper API key not configured');
    }
    
    try {
      const response = await fetch('https://google.serper.dev/search', {
        method: 'POST',
        headers: {
          'X-API-KEY': this.apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          q: query,
          num: 12,
          gl: 'br',
          hl: 'pt-br'
        }),
      });
      
      if (!response.ok) {
        throw new Error(`Serper API error: ${response.status}`);
      }
      
      const data = await response.json() as any;
      return (data.organic || []).map((result: any) => result.link).filter(Boolean);
    } catch (error) {
      console.error('Serper search failed:', error);
      throw error;
    }
  }
}

class FallbackSearchProvider implements SearchProvider {
  name = 'fallback';
  
  private knownDomains = [
    'amazon.com.br',
    'mercadolivre.com.br', 
    'magazineluiza.com.br',
    'kabum.com.br',
    'americanas.com.br',
    'shopee.com.br',
    'submarino.com.br',
  ];
  
  async search(query: string): Promise<string[]> {
    // Generate base URLs for known domains - rapid scanning
    const searchUrls: string[] = [];
    const encodedQuery = encodeURIComponent(query);
    
    for (const domain of this.knownDomains) {
      if (domain.includes('amazon')) {
        searchUrls.push(`https://${domain}/s?k=${encodedQuery}`);
      } else if (domain.includes('mercadolivre')) {
        searchUrls.push(`https://lista.${domain}/${encodedQuery}`);
      } else if (domain.includes('magazineluiza')) {
        searchUrls.push(`https://${domain}/busca/${encodedQuery}`);
      } else if (domain.includes('kabum')) {
        searchUrls.push(`https://${domain}/busca/${encodedQuery}`);
      } else {
        searchUrls.push(`https://${domain}/busca?q=${encodedQuery}`);
      }
    }
    
    return searchUrls;
  }
}

export function createSearchProvider(env: any): SearchProvider {
  const serpProvider = env.SERP_PROVIDER;
  const serpApiKey = env.SERP_API_KEY;
  
  if (serpProvider === 'serper' && serpApiKey) {
    return new SerperSearchProvider(serpApiKey);
  }
  
  // Always fallback to known domain scanning
  return new FallbackSearchProvider();
}
